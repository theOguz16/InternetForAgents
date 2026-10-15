const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { validateRegistryCard, CardValidationError } = require('../dist/services/capabilities/agent-card.js');
const { registryRouter } = require('../dist/services/registry/router.js');
const { RegistryStore } = require('../dist/services/registry/store.js');
const originalManifest = require('../examples/manifests/text-length.json');
function card(base) {
  return { name: 'Example', capabilities: { streaming: true }, skills: [{ id: 'text-length', name: 'Length', description: 'Count code points', tags: ['text'] }], supportedInterfaces: [{ url: `${base}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }] };
}
test('Card: doğrulanmış projection ve eski minimal skill uyumu', () => {
  const base = 'http://127.0.0.1:4201';
  const value = card(base);
  value.extensions = { unrelated: true };
  assert.deepEqual(validateRegistryCard(value, new URL(`${base}/.well-known/agent-card.json`)), { name: 'Example', skillIds: ['text-length'], endpoint: `${base}/a2a` });
  value.skills = [{ id: 'text-length' }];
  assert.equal(validateRegistryCard(value, new URL(base)).skillIds[0], 'text-length');
});
test('Card: bozuk tipler, tekrarlar, sınırlar ve belirsiz arayüz reddi', () => {
  const base = 'http://127.0.0.1:4201';
  const mutations = [
    c => c.name = [], c => c.capabilities = [], c => c.capabilities.streaming = 'true',
    c => c.skills = [], c => c.skills = Array.from({ length: 17 }, (_, i) => ({ id: `skill-${i}` })),
    c => c.skills.push(c.skills[0]), c => c.skills[0].id = ' ', c => c.skills[0].id = ' padded',
    c => c.skills[0].id = 5, c => c.skills[0].tags = 'text', c => c.skills[0].description = {},
    c => c.skills[0].tags = [null], c => c.supportedInterfaces = [],
    c => c.supportedInterfaces.push(c.supportedInterfaces[0]),
    c => c.supportedInterfaces[0].url = 'http://elsewhere/a2a',
    c => c.supportedInterfaces[0].url = `${base}/a2a?q=1`,
    c => c.supportedInterfaces[0].url = `${base}/wrong`,
    c => c.supportedInterfaces[0].url = 'javascript:alert(1)',
    c => c.supportedInterfaces[0].url = 'http://user:pass@127.0.0.1:4201/a2a',
    c => c.supportedInterfaces[0].protocolVersion = '0.3',
    c => c.supportedInterfaces[0].protocolBinding = null,
    c => c.supportedInterfaces.push(null),
  ];
  for (const mutate of mutations) {
    const value = card(base); mutate(value);
    assert.throws(() => validateRegistryCard(value, new URL(base)), error => error instanceof CardValidationError && error.path.startsWith('/card/'));
  }
  assert.throws(() => validateRegistryCard([], new URL(base)), CardValidationError);
});
async function listen(app) {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
async function close(server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
test('Registry HTTP: 422 hatalı yenilemede snapshot/digest/kimlik korunur', async () => {
  let currentCard; let currentManifest = structuredClone(originalManifest);
  const provider = express();
  provider.get('/.well-known/agent-card.json', (_req, res) => res.json(currentCard));
  provider.get('/ifa/capabilities.json', (_req, res) => res.json(currentManifest));
  const remote = await listen(provider);
  currentCard = card(remote.base);
  const store = new RegistryStore(':memory:');
  const registry = express(); registry.use(express.json()); registry.use('/v1', registryRouter(new Set([remote.base]), store));
  const api = await listen(registry);
  const request = { cardUrl: `${remote.base}/.well-known/agent-card.json`, manifestUrl: `${remote.base}/ifa/capabilities.json` };
  const post = body => fetch(`${api.base}/v1/agents`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const response = await post(request); assert.equal(response.status, 201);
    const saved = await response.json();
    assert.deepEqual(saved.manifest, originalManifest);
    assert.ok(saved.capabilityDigests['team-example/text-length@1.0.0']);
    for (const [mutate, code] of [
      [() => currentCard.skills.push({ id: 'text-length' }), 'duplicate_skill_id'],
      [() => currentCard.skills = [{ id: 'not-in-manifest' }], 'invalid_skill_binding'],
      [() => currentCard.skills = [], 'invalid_card_list'],
      [() => currentCard.supportedInterfaces[0].url = 'http://other/a2a', 'endpoint_not_allowed'],
      [() => currentManifest.capabilities[0].inputSchema.properties.text.pattern = '.*', 'unsupported_field'],
    ]) {
      currentCard = card(remote.base); currentManifest = structuredClone(originalManifest); mutate();
      const bad = await post(request); assert.equal(bad.status, 422);
      const error = await bad.json(); assert.equal(error.error, code); assert.equal(typeof error.path, 'string');
      assert.deepEqual(store.get(saved.id), saved);
      assert.deepEqual(await (await fetch(`${api.base}/v1/agents/${saved.id}`)).json(), saved);
    }
    currentCard = card(remote.base); currentManifest = structuredClone(originalManifest);
    const updated = await post(request); assert.equal(updated.status, 200);
    assert.equal((await updated.json()).id, saved.id);
    const found = await (await fetch(`${api.base}/v1/agents?profile=team-example/text-length`)).json();
    assert.deepEqual(found.agents[0].manifest, originalManifest);
    // Eksik skill kontrolü manifest gönderilmeyen legacy yolda da uygulanır.
    currentCard.skills = [{ id: 'text-language.v1' }, { id: 'text-language.v1' }];
    assert.equal((await post({ cardUrl: request.cardUrl })).status, 422);
    assert.equal(store.list().length, 1);
  } finally { await close(api.server); await close(remote.server); store.close(); }
});
