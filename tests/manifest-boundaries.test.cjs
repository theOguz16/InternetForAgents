const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const Ajv = require('ajv');
const { validateManifest, ManifestError } = require('../dist/services/capabilities/manifest.js');
const original = require('../examples/manifests/text-length.json');
const copy = () => structuredClone(original);
const validate = m => validateManifest(m, m.capabilities.map(c => c.skillId));
const closed = properties => ({ type: 'object', additionalProperties: false, properties });
function rejects(m, code, path) {
  assert.throws(() => validate(m), e => e instanceof ManifestError && e.code === code && (!path || e.path === path));
}
function input(schema, example = {}) {
  const m = copy(); m.capabilities[0].inputSchema = schema; m.capabilities[0].examples[0].input = example; return m;
}

test('B04: schema derinliği 7/8 kabul, 9 ret; object ve array yolları', () => {
  for (const array of [false, true]) for (const depth of [7, 8, 9]) {
    let schema = { type: 'boolean' };
    for (let i = 1; i < depth; i++) schema = array ? { type: 'array', maxItems: 1, items: schema } : closed({ child: schema });
    const m = input(closed({ child: schema }));
    if (depth <= 8) validate(m); else rejects(m, 'schema_depth_exceeded');
  }
});
test('B04: toplam property 99/100 kabul, 101 ret; bütçe iç içe alanlarda paylaşılır', () => {
  for (const count of [99, 100, 101]) {
    const properties = Object.fromEntries(Array.from({ length: count - 1 }, (_, i) => [`p${i}`, { type: 'boolean' }]));
    const m = input(closed({ nested: closed(properties) }));
    if (count <= 100) validate(m); else rejects(m, 'schema_properties_exceeded');
  }
});
test('B04: enum 99/100 kabul, 101 ve boş/tekrar enum ret; const uygulanır', () => {
  for (const count of [99, 100, 101, 0]) {
    const m = input(closed({ n: { type: 'integer', maximum: 200, enum: Array.from({ length: count }, (_, i) => i) } }));
    if (count > 0 && count <= 100) validate(m); else rejects(m, 'invalid_enum');
  }
  rejects(input(closed({ n: { type: 'integer', maximum: 2, enum: [1, 1] } })), 'invalid_schema');
  validate(input(closed({ ok: { type: 'boolean', const: true } }), { ok: true }));
  rejects(input(closed({ ok: { type: 'boolean', const: true } }), { ok: false }), 'invalid_example');
});
// Sabit ASCII dolgu ile byte sınırını tam tuttururuz; karakter sayısı ölçmeyiz.
function byteSized(size) {
  const m = input(closed({ padding: { type: 'string', maxLength: 32768, enum: ['0', '1', '2', '3', '4'] } }));
  let remaining = size - Buffer.byteLength(JSON.stringify(m));
  const values = m.capabilities[0].inputSchema.properties.padding.enum;
  for (let i = 0; i < values.length; i++) {
    const amount = Math.min(32767, remaining); values[i] += 'x'.repeat(amount); remaining -= amount;
  }
  assert.equal(remaining, 0); assert.equal(Buffer.byteLength(JSON.stringify(m)), size); return m;
}
test('B04: manifest 131071/131072 byte kabul, 131073 ret; UTF-8 byte ölçümü', () => {
  validate(byteSized(131071)); validate(byteSized(131072));
  rejects(byteSized(131073), 'manifest_too_large', '/');
  const unicode = byteSized(131072);
  unicode.capabilities[0].inputSchema.properties.padding.enum[0] = unicode.capabilities[0].inputSchema.properties.padding.enum[0].replace('x', 'ğ');
  rejects(unicode, 'manifest_too_large', '/');
});
test('B04: capability ve örnek sayıları; kimlik, sürüm ve çalışma modu', () => {
  for (const count of [15, 16, 17, 0]) {
    const m = copy(); m.capabilities = Array.from({ length: count }, (_, i) => ({ ...structuredClone(original.capabilities[0]), id: `team/skill-${i}`, skillId: `skill-${i}` }));
    if (count > 0 && count <= 16) validate(m); else rejects(m, 'invalid_capabilities');
  }
  for (const count of [9, 10, 11, 0]) {
    const m = copy(); m.capabilities[0].examples = Array.from({ length: count }, () => ({ input: { text: 'abc' }, output: { length: 3 } }));
    if (count > 0 && count <= 10) validate(m); else rejects(m, 'invalid_examples');
  }
  for (const mode of ['fixture', 'deterministic', 'model']) { const m = copy(); m.capabilities[0].executionMode = mode; validate(m); }
  for (const mode of [['model'], {}, null, 1, 'unknown']) { const m = copy(); m.capabilities[0].executionMode = mode; rejects(m, 'unsupported_execution'); }
  for (const version of ['01.0.0', '1.0.0-beta', '1.0.0+build', '1000000000.0.0']) { const m = copy(); m.capabilities[0].version = version; rejects(m, 'unsupported_version'); }
  for (const id of ['plain', '../name', 'Team/name']) { const m = copy(); m.capabilities[0].id = id; rejects(m, 'invalid_or_duplicate_capability'); }
});
test('B04: sonlu string/array/number sınırları ve kötü input/output örnekleri', () => {
  for (const [type, limit, max] of [['string', 'maxLength', 32768], ['array', 'maxItems', 1000]]) {
    const schema = { type, [limit]: max, ...(type === 'array' ? { items: { type: 'boolean' } } : {}) };
    validate(input(closed({ value: schema })));
    validate(input(closed({ value: { ...schema, [limit]: max - 1 } })));
    for (const bound of [max + 1, -1, 0.5, '1', undefined]) rejects(input(closed({ value: { ...schema, [limit]: bound } })), 'invalid_bound');
  }
  for (const maximum of [Infinity, NaN, undefined, '3']) rejects(input(closed({ value: { type: 'number', maximum } })), 'finite_maximum_required');
  rejects(input(closed({ value: { type: 'number', minimum: 2, maximum: 1 } })), 'invalid_minimum');
  rejects(input(closed({ value: { type: 'string', minLength: 2, maxLength: 1 } })), 'invalid_bound');
  rejects(input(closed({ value: { type: 'array', minItems: 2, maxItems: 1, items: { type: 'boolean' } } })), 'invalid_bound');
  rejects(input({ ...closed({}), required: ['missing'] }), 'invalid_required');
  rejects(input({ ...closed({ ok: { type: 'boolean' } }), required: ['ok', 'ok'] }), 'invalid_required');
  for (const key of ['__proto__', 'constructor', 'prototype']) rejects(input(closed({ [key]: { type: 'boolean' } })), 'unsafe_property');
  for (const field of ['input', 'output']) { const m = copy(); m.capabilities[0].examples[0][field] = { wrong: true }; rejects(m, 'invalid_example'); }
});
test('B04: desteklenmeyen keyword Ajv derlemesinden önce reddedilir; uzak ref ağ isteği üretmez', async () => {
  let requests = 0;
  const server = http.createServer((_req, res) => { requests++; res.end('{}'); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const remote = `http://127.0.0.1:${server.address().port}/schema`;
  const compile = Ajv.prototype.compile; let compiles = 0;
  Ajv.prototype.compile = function (...args) { compiles++; return compile.apply(this, args); };
  try {
    for (const [keyword, value] of [['$ref', remote], ['$ref', '#/definitions/local'], ['pattern', '(a+)+$'], ['format', 'email'], ['oneOf', []], ['anyOf', []], ['allOf', []], ['unknown', true]]) {
      const m = copy(); m.capabilities[0].inputSchema.properties.text[keyword] = value;
      rejects(m, 'unsupported_field', `/capabilities/0/inputSchema/properties/text/${keyword}`);
    }
    assert.equal(compiles, 0);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests, 0);
  } finally { Ajv.prototype.compile = compile; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('B04: call/result makine şemaları zorunlu alan, tür ve kapalı envelope kontrolü', () => {
  const ajv = new Ajv({ strict: true });
  for (const [kind, payload] of [['call', 'input'], ['result', 'output']]) {
    const schema = require(`../schemas/ifa-${kind}.v1.schema.json`);
    const check = ajv.compile(schema);
    const value = { contract: `ifa-${kind}.v1`, capability: { id: 'team-example/text-length', version: '1.0.0' }, invocationId: 'a0e6cce4-1912-4654-9c63-33ce09a1dfee', [payload]: {}, ...(kind === 'result' ? { mode: 'deterministic' } : {}) };
    assert.equal(check(value), true);
    for (const key of Object.keys(value)) { const bad = structuredClone(value); delete bad[key]; assert.equal(check(bad), false, key); }
    for (const mutate of [v => v.extra = true, v => v.contract = 'other', v => v.invocationId = 'wrong', v => v.capability.id = 'bad', v => v.capability.version = '01.0.0', v => v.capability.extra = true, v => v[payload] = [], v => v[payload] = null]) {
      const bad = structuredClone(value); mutate(bad); assert.equal(check(bad), false);
    }
    if (kind === 'result') for (const mode of ['unknown', ['model'], null]) assert.equal(check({ ...value, mode }), false);
  }
});
