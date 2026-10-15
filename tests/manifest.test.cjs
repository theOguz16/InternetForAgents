const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateManifest, capabilityDigest } = require('../dist/services/capabilities/manifest.js');
const { RegistryStore } = require('../dist/services/registry/store.js');
const original = require('../examples/manifests/text-length.json');
const copy = () => structuredClone(original);

test('Manifest: bilinmeyen beceri kabulü, örnek doğrulama ve negatif schema sınırları', () => {
  assert.equal(validateManifest(copy(), ['text-length']).capabilities[0].id, 'team-example/text-length');
  for (const mutate of [
    m => m.capabilities[0].inputSchema.properties.text.pattern = '(a+)+$',
    m => m.capabilities[0].inputSchema.properties.text.$ref = 'http://localhost/secret',
    m => delete m.capabilities[0].inputSchema.properties.text.maxLength,
    m => m.capabilities[0].examples[0].output.length = 'wrong',
    m => m.capabilities.push(m.capabilities[0]),
    m => m.capabilities[0].sideEffects = 'network',
    m => m.capabilities[0].version = '01.0.0',
    m => m.capabilities[0].inputSchema.additionalProperties = true,
  ]) { const manifest = copy(); mutate(manifest); assert.throws(() => validateManifest(manifest, ['text-length'])); }
  assert.throws(() => validateManifest(copy(), ['other']));
});
test('Manifest digest: anahtar sırası/skill binding bağımsız; farklı semantik farklı digest', () => {
  const cap = original.capabilities[0];
  assert.equal(capabilityDigest(cap), capabilityDigest(Object.fromEntries(Object.entries(cap).reverse())));
  assert.equal(capabilityDigest(cap), capabilityDigest({ ...cap, skillId: 'provider-specific' }));
  assert.notEqual(capabilityDigest(cap), capabilityDigest({ ...cap, description: 'Different meaning' }));
});
test('Registry: değişmez profile sürümü ve başarısız transaction snapshot koruması', () => {
  const store = new RegistryStore(':memory:');
  const entry = { cardUrl: 'http://agent/.well-known/agent-card.json', endpoint: 'http://agent/a2a', name: 'Demo', profiles: ['team-example/text-length'], registeredAt: '2026-10-15', manifest: copy() };
  try {
    const first = store.save(entry);
    const changed = structuredClone(entry); changed.manifest.capabilities[0].description = 'Different';
    assert.throws(() => store.save(changed), /./);
    assert.deepEqual(store.get(first.entry.id), first.entry);
    changed.manifest.capabilities[0].version = '1.0.1';
    assert.equal(store.save(changed).entry.id, first.entry.id);
    assert.throws(() => store.save({ ...changed, manifest: { ...changed.manifest, capabilities: [{ ...changed.manifest.capabilities[0], version: '1.0.0' }] } }));
  } finally { store.close(); }
});
