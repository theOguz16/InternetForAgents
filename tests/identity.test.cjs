const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const express = require('express');
const { can, LOCAL_DEMO_PRINCIPAL } = require('../dist/services/identity/domain/principal.js');
const { IdentityService } = require('../dist/services/identity/application/identity-service.js');
const { SqliteIdentityStore } = require('../dist/services/identity/infrastructure/sqlite-identity-store.js');
const { authenticate, SESSION_COOKIE } = require('../dist/services/identity/http/authenticate.js');
const { sessionRouter } = require('../dist/services/identity/http/session-router.js');
const { JobService } = require('../dist/services/personal/application/job-service.js');
const { LEGACY_OWNER_ID } = require('../dist/services/personal/domain/job.js');
const { personalRouter } = require('../dist/services/personal/router.js');
const { registryGateway } = require('../dist/services/personal/registry-gateway.js');

const sha256 = value => createHash('sha256').update(value).digest('hex');

test('E01: identity domain çalışma anı importu içermez; application framework kullanmaz', () => {
  const root = join(__dirname, '..', 'services', 'identity');
  const files = dir => readdirSync(join(root, dir)).filter(n => n.endsWith('.ts')).map(n => readFileSync(join(root, dir, n), 'utf8'));
  const specifiers = text => [...text.matchAll(/^\s*import\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map(m => ({ typeOnly: Boolean(m[1]), specifier: m[2] }));
  for (const text of files('domain')) assert.deepEqual(specifiers(text).filter(i => !i.typeOnly), []);
  for (const text of files('application')) assert.deepEqual(specifiers(text).filter(i => /^(express|node:sqlite|@a2a-js\/)/.test(i.specifier) || i.specifier.includes('/infrastructure/') || i.specifier.includes('/http/')), []);
  // Personal domain identity'yi import etmez; eski kayıt sahibi aynı demo principal olmalı.
  assert.equal(LEGACY_OWNER_ID, LOCAL_DEMO_PRINCIPAL.id);
});

test('E01 izin matrisi: sahiplik, rol ve varsayılan red', () => {
  const alice = { id: 'a', name: 'Alice', role: 'user' };
  const dev = { id: 'd', name: 'Dev', role: 'developer' };
  const otherDev = { id: 'd2', name: 'Dev2', role: 'developer' };
  const op = { id: 'o', name: 'Op', role: 'operator' };
  const aliceJob = { ownerId: 'a' };
  const table = [
    [alice, 'job.create', {}, true], [dev, 'job.create', {}, true], [undefined, 'job.create', {}, false],
    [alice, 'job.read', aliceJob, true], [dev, 'job.read', aliceJob, false], [op, 'job.read', aliceJob, false],
    [op, 'job.readMetadata', aliceJob, true], [dev, 'job.readMetadata', aliceJob, false],
    [alice, 'job.delete', aliceJob, true], [op, 'job.delete', aliceJob, false],
    // Agent sahibi olmak başka kullanıcının sonucunu açmaz: artifact sahibi iş sahibidir.
    [alice, 'artifact.read', aliceJob, true], [dev, 'artifact.read', aliceJob, false], [op, 'artifact.read', aliceJob, false],
    [dev, 'registration.create', {}, true], [alice, 'registration.create', {}, false], [op, 'registration.create', {}, false],
    [dev, 'registration.update', { ownerId: 'd' }, true], [otherDev, 'registration.update', { ownerId: 'd' }, false],
    [op, 'registration.update', { ownerId: 'd' }, false], [dev, 'registration.update', {}, false],
    [op, 'registration.suspend', { ownerId: 'd' }, true], [dev, 'registration.suspend', { ownerId: 'd' }, false],
    [op, 'policy.change', {}, true], [dev, 'policy.change', {}, false],
    [op, 'unknown.action', {}, false],
  ];
  for (const [principal, action, resource, expected] of table) {
    assert.equal(can(principal, action, resource), expected, `${principal?.role ?? 'anon'} ${action} ${JSON.stringify(resource)}`);
  }
});

function identityWithClock(start = new Date('2026-11-19T10:00:00Z'), options) {
  let now = start;
  const store = new SqliteIdentityStore(':memory:');
  const identity = new IdentityService(store, { now: () => now }, options);
  return { identity, store, advance: ms => { now = new Date(now.getTime() + ms); } };
}

test('E01 IdentityService: token yalnız hash olarak saklanır; iptal ve yenileme eski yetkiyi kapatır', () => {
  const { identity, store } = identityWithClock();
  const { principal, token } = identity.createPrincipal('Ayşe', 'developer');
  assert.match(token, /^ifa_[A-Za-z0-9_-]{43}$/);
  assert.ok(!JSON.stringify(store.listPrincipals()).includes(token), 'düz token saklanmamalı');
  assert.equal(store.findPrincipalByTokenHash(sha256(token)).id, principal.id);
  assert.ok(!JSON.stringify(identity.list()).includes('tokenHash'));
  assert.deepEqual(identity.authenticateToken(token), principal);
  for (const bad of [undefined, '', 'ifa_short', token + 'x', `Bearer ${token}`, 42]) assert.equal(identity.authenticateToken(bad), undefined);
  assert.throws(() => identity.createPrincipal('', 'user'), /invalid_name/);
  assert.throws(() => identity.createPrincipal('x', 'admin'), /invalid_role/);

  const session = identity.login(token);
  const rotated = identity.rotateToken(principal.id);
  assert.equal(identity.authenticateToken(token), undefined, 'eski token geçersiz');
  assert.deepEqual(identity.authenticateToken(rotated), principal);
  assert.equal(identity.resolveSession(session.sessionId), undefined, 'yenileme açık oturumu kapatır');

  const second = identity.login(rotated);
  assert.equal(identity.revoke(principal.id), true);
  assert.equal(identity.revoke(principal.id), false);
  assert.equal(identity.authenticateToken(rotated), undefined);
  assert.equal(identity.resolveSession(second.sessionId), undefined);
  assert.equal(identity.login(rotated), undefined);
  assert.equal(identity.rotateToken(principal.id), undefined, 'iptal edilmiş principal yenilenemez');
});

test('E01 IdentityService: oturum süresi, logout, CSRF ve oturum sayısı sınırı', () => {
  const { identity, store, advance } = identityWithClock(undefined, { sessionTtlMs: 60_000, maxSessionsPerPrincipal: 2 });
  const { principal, token } = identity.createPrincipal('Ali', 'user');
  const grant = identity.login(token);
  assert.ok(!JSON.stringify(store.sessionsOf(principal.id)).includes(grant.sessionId), 'session kimliği düz saklanmamalı');
  const resolved = identity.resolveSession(grant.sessionId);
  assert.deepEqual(resolved.principal, principal);
  assert.equal(identity.checkCsrf(resolved, grant.csrfToken), true);
  for (const bad of [undefined, '', 'ifc_x', grant.sessionId]) assert.equal(identity.checkCsrf(resolved, bad), false);
  advance(59_999);
  assert.ok(identity.resolveSession(grant.sessionId), 'süre dolmadan geçerli');
  advance(1);
  assert.equal(identity.resolveSession(grant.sessionId), undefined, 'tam süre sonunda geçersiz');
  assert.equal(store.sessionsOf(principal.id).length, 0, 'süresi dolan oturum silinir');

  const a = identity.login(token), b = identity.login(token), c = identity.login(token);
  assert.equal(identity.resolveSession(a.sessionId), undefined, 'sınır aşılınca en eski oturum kapanır');
  assert.ok(identity.resolveSession(b.sessionId)); assert.ok(identity.resolveSession(c.sessionId));
  identity.logout(c.sessionId);
  assert.equal(identity.resolveSession(c.sessionId), undefined);
  assert.ok(identity.resolveSession(b.sessionId), 'logout yalnız o oturumu kapatır');
});

// --- HTTP: kimlik middleware'i + Personal + Registry gateway ---

function fakeJobs() {
  const directory = { async find(profile) { return [{ id: `a-${profile}`, name: 'agent', endpoint: 'http://agent.test/a2a', profiles: [profile] }]; } };
  const gateway = { async connect(_p, profile) { return { async execute(_text, hooks) { hooks.progressed(); return { terminal: 'completed', result: { profile, mode: 'deterministic', output: { secret: 'alice-private' } } }; } }; } };
  const state = { jobs: [], keys: [] };
  const repository = { load: () => structuredClone(state), save(next) { Object.assign(state, structuredClone(next)); } };
  return new JobService({ repository, clock: { now: () => new Date() }, directory, gateway, allowedOrigins: new Set(['http://agent.test']) });
}
async function serve(t, mode, clockStart) {
  const { identity, advance } = identityWithClock(clockStart);
  const app = express(); app.use(express.json({ limit: '64kb' }));
  const auth = authenticate(identity, mode);
  app.use('/v1', sessionRouter(identity, { secure: true }));
  app.use('/v1', auth, personalRouter(fakeJobs()));
  app.use('/registry', auth, registryGateway('http://127.0.0.1:1'));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });
  return { base: `http://127.0.0.1:${server.address().port}`, identity, advance };
}
const call = (url, { method = 'GET', body, headers = {} } = {}) => fetch(url, {
  method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
  body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(5000),
});
const bearer = token => ({ authorization: `Bearer ${token}` });
const job = { text: 'Merhaba dünya', skills: ['language'] };
const untilDone = async (base, id, headers) => {
  for (let i = 0; i < 50; i++) { const value = await (await call(`${base}/v1/jobs/${id}`, { headers })).json(); if (value.status !== 'running') return value; await new Promise(r => setTimeout(r, 10)); }
  throw new Error('job did not finish');
};

test('E01 HTTP: A kullanıcısı B’nin job’unu, sonucunu ve akışını okuyamaz; anahtarlar çağırana özel', async t => {
  const { base, identity } = await serve(t, 'required');
  const alice = identity.createPrincipal('Alice', 'user').token;
  const bob = identity.createPrincipal('Bob', 'user').token;
  const operator = identity.createPrincipal('Op', 'operator').token;

  assert.equal((await call(`${base}/v1/jobs`, { method: 'POST', body: job, headers: { 'Idempotency-Key': 'k' } })).status, 401, 'kimliksiz istek');
  assert.equal((await call(`${base}/v1/jobs/x`, { headers: { authorization: 'Bearer nope' } })).status, 401, 'bozuk token');

  const created = await call(`${base}/v1/jobs`, { method: 'POST', body: job, headers: { ...bearer(alice), 'Idempotency-Key': 'k' } });
  assert.equal(created.status, 202);
  const { id } = await created.json();
  const done = await untilDone(base, id, bearer(alice));
  assert.equal(done.children[0].output.output.secret, 'alice-private');

  for (const [who, token] of [['bob', bob], ['operator', operator]]) {
    const read = await call(`${base}/v1/jobs/${id}`, { headers: bearer(token) });
    assert.equal(read.status, 404, `${who} okuyamaz`);
    assert.ok(!(await read.text()).includes('alice-private'));
    assert.equal((await call(`${base}/v1/jobs/${id}/events`, { headers: bearer(token) })).status, 404, `${who} akışı açamaz`);
  }
  // Aynı anahtar başka kullanıcıda çatışma (409) üretmez; varlık sızmaz ve yeni iş açılır.
  const bobJob = await call(`${base}/v1/jobs`, { method: 'POST', body: { ...job, text: 'farklı' }, headers: { ...bearer(bob), 'Idempotency-Key': 'k' } });
  assert.equal(bobJob.status, 202);
  assert.notEqual((await bobJob.json()).id, id);
  const again = await call(`${base}/v1/jobs`, { method: 'POST', body: job, headers: { ...bearer(alice), 'Idempotency-Key': 'k' } });
  assert.equal(again.status, 200); assert.equal((await again.json()).id, id);
});

test('E01 HTTP: cookie oturumu HttpOnly/SameSite/Secure; mutasyon CSRF ister; logout ve süre sonu', async t => {
  const { base, identity, advance } = await serve(t, 'required');
  const { principal, token } = identity.createPrincipal('Ayşe', 'user');

  assert.equal((await call(`${base}/v1/session`, { method: 'POST', body: { token: 'ifa_wrong' } })).status, 401);
  assert.equal((await call(`${base}/v1/session`, { method: 'POST', body: { token, extra: 1 } })).status, 401);
  // Siteler arası düz form JSON gönderemez: text/plain gövde ayrıştırılmaz ve giriş başarısız olur.
  assert.equal((await call(`${base}/v1/session`, { method: 'POST', body: JSON.stringify({ token }), headers: { 'content-type': 'text/plain' } })).status, 401);

  const login = await call(`${base}/v1/session`, { method: 'POST', body: { token } });
  assert.equal(login.status, 201);
  const [setCookie] = login.headers.getSetCookie();
  assert.match(setCookie, new RegExp(`^${SESSION_COOKIE}=ifs_`));
  for (const attr of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/', 'Max-Age=28800']) assert.ok(setCookie.includes(attr), attr);
  assert.equal(login.headers.get('cache-control'), 'no-store');
  const grant = await login.json();
  assert.deepEqual(grant.principal, principal);
  assert.ok(!JSON.stringify(grant).includes(token));
  const cookie = { cookie: setCookie.split(';')[0] };

  const current = await (await call(`${base}/v1/session`, { headers: cookie })).json();
  assert.equal(current.csrfToken, grant.csrfToken, 'sayfa yenilenince CSRF token alınabilir');
  assert.equal((await call(`${base}/v1/jobs/none`, { headers: cookie })).status, 404, 'güvenli istek CSRF istemez');

  const post = headers => call(`${base}/v1/jobs`, { method: 'POST', body: job, headers: { ...cookie, 'Idempotency-Key': 'c', ...headers } });
  assert.equal((await post({})).status, 403, 'CSRF yok');
  assert.equal((await post({ 'x-csrf-token': 'ifc_wrong' })).status, 403, 'yanlış CSRF');
  assert.equal((await post({ 'x-csrf-token': grant.csrfToken })).status, 202);

  assert.equal((await call(`${base}/v1/session`, { method: 'DELETE', headers: cookie })).status, 403, 'logout da CSRF ister');
  const logout = await call(`${base}/v1/session`, { method: 'DELETE', headers: { ...cookie, 'x-csrf-token': grant.csrfToken } });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.getSetCookie()[0], /Max-Age=0/);
  assert.equal((await call(`${base}/v1/jobs/none`, { headers: cookie })).status, 401, 'logout sonrası cookie geçersiz');
  assert.equal((await call(`${base}/v1/session`, { headers: cookie })).status, 401);

  const fresh = await call(`${base}/v1/session`, { method: 'POST', body: { token } });
  const freshCookie = { cookie: fresh.headers.getSetCookie()[0].split(';')[0] };
  advance(8 * 60 * 60 * 1000);
  assert.equal((await call(`${base}/v1/jobs/none`, { headers: freshCookie })).status, 401, 'süre sonunda geçersiz');
});

test('E01 HTTP: kayıt yalnız developer; local-demo yalnız kimlik bilgisi yoksa devreye girer', async t => {
  const required = await serve(t, 'required');
  const user = required.identity.createPrincipal('User', 'user').token;
  const dev = required.identity.createPrincipal('Dev', 'developer').token;
  const register = headers => call(`${required.base}/registry/agents`, { method: 'POST', body: { cardUrl: 'http://agent.test/.well-known/agent-card.json' }, headers });
  assert.equal((await register({})).status, 401);
  assert.equal((await register(bearer(user))).status, 403, 'user kayıt yapamaz');
  // Developer gateway'den geçer; sahte Registry adresine ulaşılamadığı için 503 döner.
  assert.equal((await register(bearer(dev))).status, 503);

  const demo = await serve(t, 'local-demo');
  const created = await call(`${demo.base}/v1/jobs`, { method: 'POST', body: job, headers: { 'Idempotency-Key': 'd' } });
  assert.equal(created.status, 202);
  const { id, ownerId } = await created.json();
  assert.equal(ownerId, LOCAL_DEMO_PRINCIPAL.id);
  assert.equal((await call(`${demo.base}/v1/jobs/x`, { headers: { authorization: 'Bearer nope' } })).status, 401, 'geçersiz token demo principal’ına düşmez');
  assert.equal((await call(`${demo.base}/v1/jobs/x`, { headers: { cookie: `${SESSION_COOKIE}=ifs_expired` } })).status, 401, 'geçersiz cookie demo principal’ına düşmez');
  const demoUser = demo.identity.createPrincipal('Gerçek', 'user').token;
  assert.equal((await call(`${demo.base}/v1/jobs/${id}`, { headers: bearer(demoUser) })).status, 404, 'gerçek kullanıcı demo işini göremez');
});

test('E01 rotateToken: okuma ile yazma arasında iptal edilen principal için token dönmez', () => {
  const { store, identity } = identityWithClock();
  const { principal } = identity.createPrincipal('Yarış', 'developer');
  // Gerçek depo üzerinde: okuma aktif görür, yazma anında principal iptal edilmiştir.
  const original = store.replaceTokenHash.bind(store);
  store.replaceTokenHash = (id, tokenHash) => { store.revokePrincipal(id, new Date().toISOString()); return original(id, tokenHash); };
  assert.equal(identity.rotateToken(principal.id), undefined);
  assert.equal(identity.authenticateToken('ifa_' + 'A'.repeat(43)), undefined);
});
