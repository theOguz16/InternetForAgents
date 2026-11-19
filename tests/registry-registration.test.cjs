const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { registryRouter } = require('../dist/services/registry/router.js');
const { RegistryStore } = require('../dist/services/registry/store.js');
const {
  parseRegistrationRequest,
  createLegacyRegistration,
  createManifestRegistration,
  matchesProfileFilter,
  isManifestEntry,
  RegistrationRequestError,
} = require('../dist/services/registry/registration.js');
const { CardValidationError } = require('../dist/services/capabilities/agent-card.js');

function customManifest() {
  return {
    manifestVersion: 'ifa-manifest.v1',
    capabilities: [
      {
        id: 'acme-lab/word-counter',
        version: '1.0.0',
        skillId: 'word-counter',
        title: 'Kelime sayacı',
        description: 'Metindeki boşlukla ayrılmış sözcük sayısını döndürür.',
        executionMode: 'deterministic',
        sideEffects: 'none',
        inputSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          additionalProperties: false,
          required: ['text'],
          properties: { text: { type: 'string', maxLength: 4000 } },
        },
        outputSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          additionalProperties: false,
          required: ['words'],
          properties: { words: { type: 'integer', minimum: 0, maximum: 4000 } },
        },
        examples: [{ input: { text: 'merhaba dunya' }, output: { words: 2 } }],
      },
      {
        id: 'org-zero/json-pretty',
        version: '1.0.0',
        skillId: 'json-pretty',
        title: 'JSON biçimleyici',
        description: 'Küçük JSON metinlerini girintili metne çevirir.',
        executionMode: 'deterministic',
        sideEffects: 'none',
        inputSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          additionalProperties: false,
          required: ['raw'],
          properties: { raw: { type: 'string', maxLength: 1000 } },
        },
        outputSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          additionalProperties: false,
          required: ['formatted'],
          properties: { formatted: { type: 'string', maxLength: 2000 } },
        },
        examples: [{ input: { raw: '{"a":1}' }, output: { formatted: '{\n  "a": 1\n}' } }],
      },
    ],
  };
}

async function serve(t, setup) {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  setup(app, base);
  return base;
}

async function post(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}

test('B01 DTO: istek ayrıştırma, legacy/manifest kurucuları ve profile eşleme', () => {
  const origin = 'http://127.0.0.1:4301';
  const allowed = new Set([origin]);
  const cardUrl = `${origin}/.well-known/agent-card.json`;
  const manifestUrl = `${origin}/ifa/capabilities.json`;

  const legacyReq = parseRegistrationRequest({ cardUrl }, allowed);
  assert.equal(legacyReq.kind, 'legacy');
  assert.equal(legacyReq.cardUrl.href, cardUrl);

  const manifestReq = parseRegistrationRequest({ cardUrl, manifestUrl }, allowed);
  assert.equal(manifestReq.kind, 'manifest');
  assert.equal(manifestReq.manifestUrl.href, manifestUrl);

  for (const invalid of [null, [], {}, { cardUrl: 123 }, { cardUrl, extra: true }]) {
    assert.throws(
      () => parseRegistrationRequest(invalid, allowed),
      err => err instanceof RegistrationRequestError && err.status === 400 && err.code === 'invalid_registration',
    );
  }
  assert.throws(
    () => parseRegistrationRequest({ cardUrl: 'http://example.com/.well-known/agent-card.json' }, allowed),
    err => err instanceof RegistrationRequestError && err.status === 422 && err.code === 'card_url_not_allowed',
  );
  // String olmayan manifestUrl mevcut HTTP sözleşmesine uygun olarak 422 card_validation_failed döner.
  for (const badManifestUrl of [123, null, {}, 'http://example.com/ifa/capabilities.json', `${origin}/wrong.json`, `${origin}/ifa/capabilities.json?x=1`]) {
    assert.throws(
      () => parseRegistrationRequest({ cardUrl, manifestUrl: badManifestUrl }, allowed),
      err => err instanceof RegistrationRequestError && err.status === 422 && err.code === 'card_validation_failed',
    );
  }

  const card = { name: 'Demo', skillIds: ['text-language.v1', 'acme-lab/word-counter', 'word-counter', 'json-pretty'], endpoint: `${origin}/a2a` };
  const legacyReg = createLegacyRegistration(card, new URL(cardUrl), '2026-11-19T00:00:00.000Z');
  assert.equal(legacyReg.kind, 'legacy');
  assert.deepEqual(legacyReg.profiles, ['text-language.v1']);

  assert.throws(
    () => createLegacyRegistration({ ...card, skillIds: ['acme-lab/word-counter'] }, new URL(cardUrl), '2026-11-19T00:00:00.000Z'),
    err => err instanceof CardValidationError && err.code === 'no_supported_skill' && err.path === '/card/skills',
  );

  const manifest = customManifest();
  const manifestReg = createManifestRegistration(card, new URL(cardUrl), manifest, new URL(manifestUrl), '2026-11-19T00:00:00.000Z');
  assert.equal(manifestReg.kind, 'manifest');
  assert.deepEqual(manifestReg.profiles, ['acme-lab/word-counter', 'org-zero/json-pretty']);

  const manifestEntry = {
    id: 'm1',
    cardUrl,
    name: 'Demo',
    profiles: ['stale-value'],
    endpoint: `${origin}/a2a`,
    registeredAt: '2026-11-19T00:00:00.000Z',
    manifestUrl,
    manifest,
    capabilityDigests: {},
  };
  assert.equal(isManifestEntry(manifestEntry), true);
  // Manifest kaydında filtreleme sabit profil listesine değil doğrudan manifest capability kimliğine bakar.
  assert.equal(matchesProfileFilter(manifestEntry, 'acme-lab/word-counter'), true);
  assert.equal(matchesProfileFilter(manifestEntry, 'org-zero/json-pretty'), true);
  assert.equal(matchesProfileFilter(manifestEntry, 'text-language.v1'), false);

  const legacyEntry = {
    id: 'l1',
    cardUrl,
    name: 'Legacy',
    profiles: ['text-language.v1'],
    endpoint: `${origin}/a2a`,
    registeredAt: '2026-11-19T00:00:00.000Z',
  };
  assert.equal(isManifestEntry(legacyEntry), false);
  assert.equal(matchesProfileFilter(legacyEntry, 'text-language.v1'), true);
  assert.equal(matchesProfileFilter(legacyEntry, 'acme-lab/word-counter'), false);

  // Store doğrudan çağrıldığında eksik/geçersiz kayıt DTO'su reddedilir.
  const store = new RegistryStore(':memory:');
  try {
    assert.throws(() => store.save({ cardUrl, name: 'Bad', profiles: [], endpoint: `${origin}/a2a`, registeredAt: '2026-11-19T00:00:00.000Z' }), TypeError);
    assert.throws(() => store.save({ kind: 'manifest', cardUrl, name: 'Bad', profiles: [], endpoint: `${origin}/a2a`, registeredAt: '2026-11-19T00:00:00.000Z', manifest }), TypeError);
  } finally {
    store.close();
  }
});

test('B01 HTTP: bilinmeyen namespace capability kaydı ve GET /v1/agents?profile=<id> filtrelemesi', async t => {
  const store = new RegistryStore(':memory:');
  t.after(() => store.close());
  const manifest = customManifest();
  const agent = await serve(t, (app, base) => {
    app.get('/.well-known/agent-card.json', (_req, res) => res.json({
      name: 'Multi Capability Agent',
      capabilities: { streaming: true },
      skills: [{ id: 'word-counter' }, { id: 'json-pretty' }],
      supportedInterfaces: [{ url: `${base}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
    }));
    app.get('/ifa/capabilities.json', (_req, res) => res.json(manifest));
  });
  const registry = await serve(t, app => app.use('/v1', registryRouter(new Set([agent]), store)));

  const res = await post(`${registry}/v1/agents`, {
    cardUrl: `${agent}/.well-known/agent-card.json`,
    manifestUrl: `${agent}/ifa/capabilities.json`,
  });
  assert.equal(res.status, 201);
  const saved = await res.json();
  assert.deepEqual(saved.profiles, ['acme-lab/word-counter', 'org-zero/json-pretty']);
  assert.equal(saved.manifestUrl, `${agent}/ifa/capabilities.json`);
  assert.ok(saved.capabilityDigests['acme-lab/word-counter@1.0.0']);
  assert.ok(saved.capabilityDigests['org-zero/json-pretty@1.0.0']);
  // Dahili DTO discriminator alanı HTTP yanıt biçimine sızmamalıdır.
  assert.equal('kind' in saved, false);

  for (const id of ['acme-lab/word-counter', 'org-zero/json-pretty']) {
    const found = await (await fetch(`${registry}/v1/agents?profile=${encodeURIComponent(id)}`)).json();
    assert.equal(found.agents.length, 1);
    assert.equal(found.agents[0].id, saved.id);
  }
  const missing = await (await fetch(`${registry}/v1/agents?profile=${encodeURIComponent('nonexistent-ns/missing')}`)).json();
  assert.deepEqual(missing.agents, []);
  assert.deepEqual(await (await fetch(`${registry}/v1/agents/${saved.id}`)).json(), saved);
});

test('B01 HTTP negatif: manifestsiz legacy-dışı skill reddi, bozuk manifest 422 ve erken URL reddi', async t => {
  const store = new RegistryStore(':memory:');
  t.after(() => store.close());
  let cardFetches = 0;
  let currentSkills = [{ id: 'word-counter' }];
  let currentManifest = customManifest();

  const agent = await serve(t, (app, base) => {
    app.get('/.well-known/agent-card.json', (_req, res) => {
      cardFetches++;
      res.json({
        name: 'Negative Case Agent',
        capabilities: { streaming: true },
        skills: currentSkills,
        supportedInterfaces: [{ url: `${base}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
      });
    });
    app.get('/ifa/capabilities.json', (_req, res) => res.json(currentManifest));
  });
  const registry = await serve(t, app => app.use('/v1', registryRouter(new Set([agent]), store)));
  const cardUrl = `${agent}/.well-known/agent-card.json`;
  const manifestUrl = `${agent}/ifa/capabilities.json`;

  // 1) Manifestsiz kayıtta legacy-dışı skill tek başına kabul edilmez.
  const noLegacy = await post(`${registry}/v1/agents`, { cardUrl });
  assert.equal(noLegacy.status, 422);
  assert.deepEqual(await noLegacy.json(), { error: 'no_supported_skill', path: '/card/skills' });
  assert.equal(store.list().length, 0);

  // 2) String olmayan veya farklı origin manifestUrl ağa çıkmadan 422 card_validation_failed döner.
  const fetchesBefore = cardFetches;
  for (const badManifestUrl of [123, null, 'http://example.com/ifa/capabilities.json']) {
    const bad = await post(`${registry}/v1/agents`, { cardUrl, manifestUrl: badManifestUrl });
    assert.equal(bad.status, 422);
    assert.deepEqual(await bad.json(), { error: 'card_validation_failed' });
  }
  assert.equal(cardFetches, fetchesBefore);

  // 3) Bozuk manifestler 422 döner ve kayıt oluşturmaz.
  currentSkills = [{ id: 'word-counter' }, { id: 'json-pretty' }];
  for (const [mutate, expectedError] of [
    [m => { m.manifestVersion = 'ifa-manifest.v99'; }, 'unsupported_manifest_version'],
    [m => { m.capabilities[0].inputSchema.properties.text.$ref = '#/defs/x'; }, 'unsupported_field'],
    [m => { m.capabilities[0].examples[0].output = { words: 'iki' }; }, 'invalid_example'],
    [m => { m.capabilities[0].skillId = 'unbound-skill'; }, 'invalid_skill_binding'],
  ]) {
    currentManifest = customManifest();
    mutate(currentManifest);
    const badManifest = await post(`${registry}/v1/agents`, { cardUrl, manifestUrl });
    assert.equal(badManifest.status, 422);
    const payload = await badManifest.json();
    assert.equal(payload.error, expectedError);
    assert.equal(typeof payload.path, 'string');
    assert.equal(store.list().length, 0);
  }
});

test('B01 HTTP: manifest kaydı legacy skill sızdırmaz ve legacy↔manifest yeniden kaydı temizdir', async t => {
  const store = new RegistryStore(':memory:');
  t.after(() => store.close());
  const manifest = customManifest();
  manifest.capabilities = [manifest.capabilities[0]];
  const agent = await serve(t, (app, base) => {
    app.get('/.well-known/agent-card.json', (_req, res) => res.json({
      name: 'Hybrid Agent',
      capabilities: { streaming: true },
      skills: [{ id: 'word-counter' }, { id: 'text-language.v1' }],
      supportedInterfaces: [{ url: `${base}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
    }));
    app.get('/ifa/capabilities.json', (_req, res) => res.json(manifest));
  });
  const registry = await serve(t, app => app.use('/v1', registryRouter(new Set([agent]), store)));
  const cardUrl = `${agent}/.well-known/agent-card.json`;
  const manifestUrl = `${agent}/ifa/capabilities.json`;

  // Manifest kaydında karttaki ek legacy skill (text-language.v1) açılmaz.
  const first = await post(`${registry}/v1/agents`, { cardUrl, manifestUrl });
  assert.equal(first.status, 201);
  const asManifest = await first.json();
  assert.deepEqual(asManifest.profiles, ['acme-lab/word-counter']);
  assert.equal((await (await fetch(`${registry}/v1/agents?profile=text-language.v1`)).json()).agents.length, 0);
  assert.equal((await (await fetch(`${registry}/v1/agents?profile=${encodeURIComponent('acme-lab/word-counter')}`)).json()).agents.length, 1);

  // Aynı cardUrl legacy moda (manifestsiz) yeniden kaydedilince kimlik korunur, manifest alanları temizlenir.
  const second = await post(`${registry}/v1/agents`, { cardUrl });
  assert.equal(second.status, 200);
  const asLegacy = await second.json();
  assert.equal(asLegacy.id, asManifest.id);
  assert.deepEqual(asLegacy.profiles, ['text-language.v1']);
  assert.equal('manifest' in asLegacy, false);
  assert.equal('manifestUrl' in asLegacy, false);
  assert.equal('capabilityDigests' in asLegacy, false);
  assert.equal((await (await fetch(`${registry}/v1/agents?profile=text-language.v1`)).json()).agents.length, 1);
  assert.equal((await (await fetch(`${registry}/v1/agents?profile=${encodeURIComponent('acme-lab/word-counter')}`)).json()).agents.length, 0);

  // Yeniden manifestli kayda geçilince aynı kimlik korunur ve capability tekrar bulunur.
  const third = await post(`${registry}/v1/agents`, { cardUrl, manifestUrl });
  assert.equal(third.status, 200);
  const restoredManifest = await third.json();
  assert.equal(restoredManifest.id, asManifest.id);
  assert.deepEqual(restoredManifest.profiles, ['acme-lab/word-counter']);
  assert.equal(restoredManifest.manifestUrl, manifestUrl);
  assert.ok(restoredManifest.capabilityDigests['acme-lab/word-counter@1.0.0']);
});
