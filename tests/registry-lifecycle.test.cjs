const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { mountSpecialist } = require('../dist/services/shared/a2a.js');
const { registryRouter } = require('../dist/services/registry/router.js');
const { RegistryStore } = require('../dist/services/registry/store.js');
const { registryPrincipal } = require('../dist/services/registry/auth.js');
const { signPrincipal, verifyPrincipal, assertSecret, PRINCIPAL_HEADER } = require('../dist/services/identity/infrastructure/principal-assertion.js');
const { IdentityService } = require('../dist/services/identity/application/identity-service.js');
const { SqliteIdentityStore } = require('../dist/services/identity/infrastructure/sqlite-identity-store.js');
const { authenticate } = require('../dist/services/identity/http/authenticate.js');
const { registryGateway } = require('../dist/services/personal/registry-gateway.js');

const SECRET = 'test-secret-'.padEnd(40, 'x');
const alice = { id: 'dev-alice', name: 'Alice', role: 'developer' };
const bob = { id: 'dev-bob', name: 'Bob', role: 'developer' };
const user = { id: 'user-1', name: 'User', role: 'user' };
const op = { id: 'op-1', name: 'Op', role: 'operator' };

async function serve(t, setup) {
  const app = express(); app.use(express.json({ limit: '64kb' }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });
  setup(app, base);
  return base;
}
/** Kartı isteğe bağlı bozulabilen gerçek bir uzman: resume yeniden doğrulamasını sınamak için. */
async function agent(t) {
  const state = { broken: false };
  const { handler } = require('../dist/services/language/handler.js');
  const base = await serve(t, (app, url) => {
    app.use((req, res, next) => { if (state.broken && req.path === '/.well-known/agent-card.json') res.status(500).json({ error: 'down' }); else next(); });
    mountSpecialist(app, 'language', url, handler);
  });
  return { base, state };
}
async function registry(t, origins, store = new RegistryStore(':memory:')) {
  const base = await serve(t, app => app.use('/v1', registryPrincipal({ mode: 'required', secret: SECRET }), registryRouter(origins, store)));
  return { base, store };
}
function call(base, method, path, principal, body) {
  const headers = { 'content-type': 'application/json' };
  if (principal) headers[PRINCIPAL_HEADER] = signPrincipal(principal, SECRET, { method, path });
  return fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
}

test('C01 imza: doğru secret/yöntem/yol/süre kabul; kurcalama, yeniden kullanım ve süre aşımı ret', () => {
  const req = { method: 'POST', path: '/v1/agents' };
  const now = Date.parse('2026-11-19T12:00:00Z');
  const header = signPrincipal(alice, SECRET, req, now);
  assert.deepEqual(verifyPrincipal(header, SECRET, req, now + 29_000), alice);
  assert.equal(verifyPrincipal(header, SECRET, req, now + 31_000), undefined, 'süre aşımı');
  assert.equal(verifyPrincipal(header, SECRET, req, now - 31_000), undefined, 'gelecekten');
  assert.equal(verifyPrincipal(header, 'other-secret'.padEnd(40, 'y'), req, now), undefined, 'yanlış secret');
  assert.equal(verifyPrincipal(header, SECRET, { method: 'DELETE', path: '/v1/agents' }, now), undefined, 'başka yönteme taşınamaz');
  assert.equal(verifyPrincipal(header, SECRET, { method: 'POST', path: '/v1/agents/x/suspend' }, now), undefined, 'başka yola taşınamaz');
  const [v, body, sig] = header.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url')), role: 'operator' })).toString('base64url');
  assert.equal(verifyPrincipal(`${v}.${forged}.${sig}`, SECRET, req, now), undefined, 'rol yükseltme');
  for (const bad of ['', 'v1', 'v1.a.b', 'v2.' + body + '.' + sig, 'x'.repeat(3000)]) assert.equal(verifyPrincipal(bad, SECRET, req, now), undefined);
  assert.throws(() => assertSecret('short'), /32/);
  assert.equal(assertSecret(undefined), undefined);
});

test('C01 HTTP: sahiplik, askıya alma, keşiften gizleme, resume yeniden doğrulaması, silme ve audit', { timeout: 20000 }, async t => {
  const { base: agentBase, state } = await agent(t);
  const { base, store } = await registry(t, new Set([agentBase]));
  const cardUrl = `${agentBase}/.well-known/agent-card.json`;

  assert.equal((await call(base, 'POST', '/v1/agents', undefined, { cardUrl })).status, 401, 'imzasız değişiklik');
  const forged = await fetch(`${base}/v1/agents`, { method: 'POST', headers: { 'content-type': 'application/json', [PRINCIPAL_HEADER]: 'v1.e30.x' }, body: JSON.stringify({ cardUrl }) });
  assert.equal(forged.status, 401);
  assert.equal((await call(base, 'POST', '/v1/agents', user, { cardUrl })).status, 403, 'user kayıt yapamaz');

  const created = await call(base, 'POST', '/v1/agents', alice, { cardUrl });
  assert.equal(created.status, 201);
  const entry = await created.json();
  assert.deepEqual([entry.ownerId, entry.status, entry.revision], ['dev-alice', 'active', 1]);
  const id = entry.id;

  // Başka geliştirici kaydı değiştiremez, askıya alamaz, silemez.
  assert.equal((await call(base, 'POST', '/v1/agents', bob, { cardUrl })).status, 403);
  assert.equal((await (await call(base, 'POST', '/v1/agents', bob, { cardUrl })).json()).error, 'not_owner');
  assert.equal((await call(base, 'POST', `/v1/agents/${id}/suspend`, bob)).status, 403);
  assert.equal((await call(base, 'DELETE', `/v1/agents/${id}`, bob)).status, 403);
  assert.equal(store.get(id).revision, 1, 'başarısız denemeler kaydı değiştirmez');

  // Sahip yenileyebilir; revision artar, kimlik korunur.
  const refreshed = await (await call(base, 'POST', '/v1/agents', alice, { cardUrl })).json();
  assert.deepEqual([refreshed.id, refreshed.revision], [id, 2]);

  // İmza başka uca taşınamaz: suspend imzası DELETE için kullanılamaz.
  const suspendHeader = signPrincipal(alice, SECRET, { method: 'POST', path: `/v1/agents/${id}/suspend` });
  assert.equal((await fetch(`${base}/v1/agents/${id}`, { method: 'DELETE', headers: { [PRINCIPAL_HEADER]: suspendHeader } })).status, 401);

  // Askıya alınan kayıt keşifte görünmez; tekil okumada yalnız sahip ve operatör görür.
  const suspended = await (await call(base, 'POST', `/v1/agents/${id}/suspend`, alice)).json();
  assert.equal(suspended.status, 'suspended');
  assert.deepEqual((await (await fetch(`${base}/v1/agents`)).json()).agents, []);
  assert.equal((await fetch(`${base}/v1/agents/${id}`)).status, 404, 'anonim göremez');
  assert.equal((await call(base, 'GET', `/v1/agents/${id}`, bob)).status, 404, 'başka geliştirici göremez');
  assert.equal((await call(base, 'GET', `/v1/agents/${id}`, alice)).status, 200);
  assert.equal((await call(base, 'GET', `/v1/agents/${id}`, op)).status, 200);
  assert.equal((await (await call(base, 'POST', '/v1/agents', alice, { cardUrl })).json()).error, 'registration_suspended', 'yenileme askıyı açmaz');

  // Resume yeniden doğrular: kart bozuksa rejected olur, eski snapshot korunur ve keşifte görünmez.
  state.broken = true;
  const failed = await call(base, 'POST', `/v1/agents/${id}/resume`, op);
  assert.equal(failed.status, 422);
  assert.equal((await failed.json()).status, 'rejected');
  assert.equal(store.get(id).status, 'rejected');
  assert.equal(store.get(id).name, entry.name, 'snapshot korunur');
  assert.deepEqual((await (await fetch(`${base}/v1/agents`)).json()).agents, []);
  state.broken = false;
  const resumed = await (await call(base, 'POST', `/v1/agents/${id}/resume`, op)).json();
  assert.equal(resumed.status, 'active');
  assert.equal(resumed.ownerId, 'dev-alice', 'operatör işlemi sahipliği değiştirmez');
  assert.equal((await (await fetch(`${base}/v1/agents`)).json()).agents.length, 1);

  // Operatör silebilir; kayıt kaybolur, audit izi kalır.
  assert.equal((await call(base, 'POST', `/v1/agents/${id}/suspend`, op)).status, 200);
  assert.equal((await call(base, 'DELETE', `/v1/agents/${id}`, op)).status, 204);
  assert.equal((await call(base, 'GET', `/v1/agents/${id}`, op)).status, 404);
  const audit = store.audit(id).map(r => [r.action, r.actorId, r.actorRole, r.fromStatus ?? null, r.toStatus ?? null]);
  assert.deepEqual(audit, [
    ['register', 'dev-alice', 'developer', null, 'active'],
    ['refresh', 'dev-alice', 'developer', 'active', 'active'],
    ['suspend', 'dev-alice', 'developer', 'active', 'suspended'],
    ['reject', 'op-1', 'operator', 'suspended', 'rejected'],
    ['resume', 'op-1', 'operator', 'rejected', 'active'],
    ['suspend', 'op-1', 'operator', 'active', 'suspended'],
    ['delete', 'op-1', 'operator', 'suspended', null],
  ]);
  assert.ok(!JSON.stringify(store.audit()).includes(SECRET), 'audit secret içermez');
  // Silinen kayıt adresi yeniden kaydedilebilir; yeni sahip yeni kimlik alır.
  const reclaimed = await (await call(base, 'POST', '/v1/agents', bob, { cardUrl })).json();
  assert.notEqual(reclaimed.id, id); assert.equal(reclaimed.ownerId, 'dev-bob');
});

test('C01 gateway: Personal kimliği imzalayıp iletir; sahiplik Registry’de uygulanır', { timeout: 20000 }, async t => {
  const { base: agentBase } = await agent(t);
  const { base: registryBase } = await registry(t, new Set([agentBase]));
  const identity = new IdentityService(new SqliteIdentityStore(':memory:'), { now: () => new Date() });
  const dev1 = identity.createPrincipal('Dev1', 'developer');
  const dev2 = identity.createPrincipal('Dev2', 'developer');
  const operator = identity.createPrincipal('Op', 'operator');
  const personal = await serve(t, app => app.use('/registry', authenticate(identity, 'required'), registryGateway(registryBase, { secret: SECRET })));
  const via = (method, path, token, body) => fetch(`${personal}${path}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const cardUrl = `${agentBase}/.well-known/agent-card.json`;

  const created = await via('POST', '/registry/agents', dev1.token, { cardUrl });
  assert.equal(created.status, 201);
  const { id, ownerId } = await created.json();
  assert.equal(ownerId, dev1.principal.id);
  assert.equal((await via('POST', `/registry/agents/${id}/suspend`, dev2.token)).status, 403);
  assert.equal((await via('POST', `/registry/agents/${id}/suspend`, operator.token)).status, 200);
  assert.equal((await via('GET', `/registry/agents/${id}`, dev2.token)).status, 404);
  assert.equal((await via('GET', `/registry/agents/${id}`, dev1.token)).status, 200);
  assert.equal((await via('DELETE', `/registry/agents/${id}`, dev1.token)).status, 204);
  assert.equal((await via('POST', '/registry/agents/not-a-uuid/suspend', dev1.token)).status, 404, 'yol enjeksiyonu yok');
  // Gateway secret olmadan imzalayamaz; required modda Registry değişikliği reddeder.
  const unsigned = await serve(t, app => app.use('/registry', authenticate(identity, 'required'), registryGateway(registryBase)));
  assert.equal((await fetch(`${unsigned}/registry/agents`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${dev1.token}` }, body: JSON.stringify({ cardUrl }) })).status, 401);
});

test('C01 migration: eski kayıt local-demo sahipli ve active okunur', () => {
  const { DatabaseSync } = require('node:sqlite');
  const { mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'ifa-c01-'));
  try {
    const path = join(dir, 'registry.sqlite');
    new RegistryStore(path).close();
    const db = new DatabaseSync(path);
    const legacy = { id: 'old', cardUrl: 'http://a/.well-known/agent-card.json', name: 'Old', profiles: ['text-language.v1'], endpoint: 'http://a/a2a', registeredAt: '2026-10-15' };
    db.prepare('INSERT INTO agents VALUES (?, ?, ?)').run('old', legacy.cardUrl, JSON.stringify(legacy)); db.close();
    const store = new RegistryStore(path);
    assert.deepEqual(store.get('old'), { ...legacy, ownerId: 'local-demo', status: 'active', revision: 1 });
    store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('C01 resume TOCTOU: doğrulama sürerken kayıt silinip başkası kaydettiyse yeni kayıt ezilmez', () => {
  const { RegistrationChangedError } = require('../dist/services/registry/store.js');
  const store = new RegistryStore(':memory:');
  const registration = owner => ({ kind: 'legacy', cardUrl: 'http://agent/.well-known/agent-card.json', name: `Agent ${owner}`, endpoint: 'http://agent/a2a', profiles: ['text-language.v1'], registeredAt: '2026-11-19' });
  const original = store.save(registration('alice'), alice).entry;
  store.setStatus(original.id, 'suspended', alice);
  // Resume'un ağ doğrulaması bitmeden: operatör siler, Bob aynı adresi kaydeder.
  store.remove(original.id, op);
  const replacement = store.save(registration('bob'), bob).entry;
  assert.throws(() => store.save(registration('alice'), op, { resume: { id: original.id, ownerId: 'dev-alice' } }), RegistrationChangedError);
  assert.deepEqual(store.get(replacement.id), replacement, 'yeni kayıt aynen korunur');
  // Kayıt tamamen silindiyse de resume yeni kayıt yaratmaz.
  store.remove(replacement.id, op);
  assert.throws(() => store.save(registration('alice'), op, { resume: { id: original.id, ownerId: 'dev-alice' } }), RegistrationChangedError);
  assert.equal(store.list().length, 0);
  store.close();
});

test('C01 HTTP: local-demo’da geçersiz imza 401; operatör kayıt oluşturamaz', async t => {
  const { base: agentBase } = await agent(t);
  const demo = await serve(t, app => app.use('/v1', registryPrincipal({ mode: 'local-demo', secret: SECRET }), registryRouter(new Set([agentBase]))));
  const cardUrl = `${agentBase}/.well-known/agent-card.json`;
  const forged = await fetch(`${demo}/v1/agents`, { method: 'POST', headers: { 'content-type': 'application/json', [PRINCIPAL_HEADER]: 'v1.e30.x' }, body: JSON.stringify({ cardUrl }) });
  assert.equal(forged.status, 401, 'bozuk imza demo principal’ına düşmez');
  assert.equal((await call(demo, 'POST', '/v1/agents', op, { cardUrl })).status, 403, 'operatör kayıt yapamaz');
  const anonymous = await fetch(`${demo}/v1/agents`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cardUrl }) });
  assert.equal(anonymous.status, 201);
  assert.equal((await anonymous.json()).ownerId, 'local-demo');
});
