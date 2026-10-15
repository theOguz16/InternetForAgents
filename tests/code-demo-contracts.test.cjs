const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const Ajv = require('ajv');
const contracts = require('@ifa/code-demo-contracts');
const { VERSION, PROFILE_IDS, schemas, functionSpecSchema, validateFunctionSpec, validateInput, validateOutput } = contracts;
const { validateManifest } = require('../dist/services/capabilities/manifest.js');
const definitions = require('../packages/code-demo-contracts/schema-definitions.cjs');
const examples = Object.values(PROFILE_IDS).map(id => require(`../examples/code-demo/${id.split('/')[1]}.json`));
const [generation, review, tests] = examples;
const clone = value => structuredClone(value);
const rejects = (fn, code) => assert.throws(fn, error => error instanceof contracts.ContractError && error.code === code);

for (const example of examples) test(`${example.capability.id}: schema, semantik ve B04 manifest alt kümesi`, () => {
  const { capability, input, output } = clone(example);
  const ajv = new Ajv({ strict: true });
  assert.equal(ajv.compile(schemas[capability.id].input)(input), true);
  assert.equal(ajv.compile(schemas[capability.id].output)(output), true);
  assert.deepEqual(validateInput(capability, input), input);
  assert.deepEqual(validateOutput(capability, output, input), output);
  const manifest = { manifestVersion: 'ifa-manifest.v1', capabilities: [{ ...capability,
    skillId: 'provider-local-skill', title: 'Demo', description: 'Contract example; no execution claim',
    executionMode: 'fixture', sideEffects: 'none', inputSchema: schemas[capability.id].input,
    outputSchema: schemas[capability.id].output, examples: [{ input, output }],
  }] };
  assert.deepEqual(validateManifest(manifest, ['provider-local-skill']), manifest);
  for (const field of Object.keys(input)) {
    const broken = clone(input); delete broken[field];
    rejects(() => validateInput(capability, broken), 'invalid_schema');
  }
  for (const field of Object.keys(output)) {
    const broken = clone(output); delete broken[field];
    rejects(() => validateOutput(capability, broken, input), 'invalid_schema');
  }
  rejects(() => validateInput(capability, { ...input, extra: true }), 'invalid_schema');
  rejects(() => validateOutput(capability, { ...output, passed: true }, input), 'invalid_schema');
  for (const version of ['1.0.1', '2.0.0', '1.0', undefined, ['1.0.0']]) {
    rejects(() => validateInput({ ...capability, version }, input), 'unsupported_version');
    rejects(() => validateOutput({ ...capability, version }, output, input), 'unsupported_version');
  }
});

test('Yayımlanan bozuk fixture dosyaları beklenen hata koduyla reddedilir', () => {
  const directory = resolve(__dirname, '../examples/code-demo/invalid');
  for (const name of readdirSync(directory)) {
    const item = JSON.parse(readFileSync(join(directory, name), 'utf8'));
    rejects(() => item.output ? validateOutput(item.capability, item.output, item.input)
      : validateInput(item.capability, item.input), item.expectedError);
  }
});

test('FunctionSpec: ASCII identifier, keyword, dunder, benzersizlik ve tip hataları', () => {
  const base = generation.input.spec;
  for (const field of Object.keys(base)) {
    const broken = clone(base); delete broken[field];
    rejects(() => validateFunctionSpec(broken), 'invalid_schema');
  }
  for (const field of ['name', 'type']) {
    const broken = clone(base); delete broken.parameters[0][field];
    rejects(() => validateFunctionSpec(broken), 'invalid_schema');
  }
  for (const name of ['sum_even', '_internal', 'A1', 'match', 'case', 'type', 'a'.repeat(64)]) {
    assert.equal(validateFunctionSpec({ ...base, functionName: name }).functionName, name);
    validateFunctionSpec({ ...base, parameters: [{ name, type: 'int' }] });
  }
  for (const name of ['1name', 'has space', 'a-b', 'gün', 'λ', '__init__', '__', 'async', 'await', 'False', 'None', 'class', 'return', 'x\n']) {
    rejects(() => validateFunctionSpec({ ...base, functionName: name }), 'invalid_identifier');
    rejects(() => validateFunctionSpec({ ...base, parameters: [{ name, type: 'int' }] }), 'invalid_identifier');
  }
  rejects(() => validateFunctionSpec({ ...base, parameters: [{ name: 'n', type: 'int' }, { name: 'n', type: 'str' }] }), 'duplicate_parameter');
  validateFunctionSpec({ ...base, parameters: [{ name: 'n', type: 'int' }, { name: 'N', type: 'str' }] });
  for (const type of ['int', 'bool', 'str', 'list[int]', 'list[str]']) validateFunctionSpec({ ...base, returnType: type, parameters: [{ name: 'x', type }] });
  for (const type of ['float', 'object', 'int | str', 'list[bool]']) {
    rejects(() => validateFunctionSpec({ ...base, returnType: type }), 'invalid_schema');
    rejects(() => validateFunctionSpec({ ...base, parameters: [{ name: 'x', type }] }), 'invalid_schema');
  }
  for (const patch of [{ language: 'javascript' }, { functionName: '' }, { functionName: 'a'.repeat(65) }, { async: true }, { parameters: [{ name: 'x', type: 'int', default: 1 }] }]) {
    rejects(() => validateFunctionSpec({ ...base, ...patch }), 'invalid_schema');
  }
});

test('FunctionSpec: 0/8/9 parametre ve requirement 1/10/11, 1/500/501 sınırları', () => {
  const spec = clone(generation.input.spec);
  for (const count of [0, 8]) validateFunctionSpec({ ...spec, parameters: Array.from({ length: count }, (_, i) => ({ name: `p${i}`, type: 'int' })) });
  rejects(() => validateFunctionSpec({ ...spec, parameters: Array.from({ length: 9 }, (_, i) => ({ name: `p${i}`, type: 'int' })) }), 'invalid_schema');
  for (const requirements of [['a'], Array(10).fill('a'.repeat(500))]) validateFunctionSpec({ ...spec, requirements });
  for (const requirements of [[], Array(11).fill('a'), [''], ['a'.repeat(501)]]) rejects(() => validateFunctionSpec({ ...spec, requirements }), 'invalid_schema');
});

test('Review: verdict/finding ilişkisi ve gerçek input satırları', () => {
  const { capability, input, output } = clone(review);
  const finding = { id: 'R1', severity: 'warning', message: 'Boundary case', suggestion: 'Add a case', line: 2 };
  validateOutput(capability, { ...output, verdict: 'changes_requested', findings: [finding] }, input);
  rejects(() => validateOutput(capability, { ...output, findings: [finding] }, input), 'inconsistent_verdict');
  rejects(() => validateOutput(capability, { ...output, verdict: 'changes_requested' }, input), 'inconsistent_verdict');
  const withFinding = (patch) => ({ ...output, verdict: 'changes_requested', findings: [{ ...finding, ...patch }] });
  rejects(() => validateOutput(capability, withFinding({ line: input.code.split('\n').length + 1 }), input), 'invalid_finding_line');
  for (const line of [0, -1, 1.5, '2', 10001]) rejects(() => validateOutput(capability, withFinding({ line }), input), 'invalid_schema');
  for (const severity of ['info', 'warning', 'error']) validateOutput(capability, withFinding({ severity }), input);
  validateOutput(capability, { ...output, verdict: 'changes_requested', findings: Array(20).fill(finding) }, input);
  rejects(() => validateOutput(capability, { ...output, verdict: 'changes_requested', findings: Array(21).fill(finding) }, input), 'invalid_schema');
  for (const [field, limit] of [['id', 64], ['message', 1000], ['suggestion', 1000]]) {
    validateOutput(capability, withFinding({ [field]: 'a'.repeat(limit) }), input);
    for (const value of ['', 'a'.repeat(limit + 1)]) rejects(() => validateOutput(capability, withFinding({ [field]: value }), input), 'invalid_schema');
  }
  const noLine = { ...finding }; delete noLine.line;
  validateOutput(capability, { ...output, verdict: 'changes_requested', findings: [noLine] }, input);
  for (const code of ['a\nb', 'a\r\nb', 'a\rb']) {
    validateOutput(capability, withFinding({ line: 2 }), { ...input, code });
    rejects(() => validateOutput(capability, withFinding({ line: 3 }), { ...input, code }), 'invalid_finding_line');
  }
  validateOutput(capability, withFinding({ line: 10000 }), { ...input, code: '\n'.repeat(9999) });
  rejects(() => validateOutput(capability, output), 'invalid_schema');
});

test('Artifact: 32767/32768/32769 UTF-8 byte ve çok byte karakter sınırları', () => {
  for (const example of examples) {
    const { capability, input, output } = example;
    for (const code of ['a'.repeat(32767), 'a'.repeat(32768), '😀'.repeat(8192)]) {
      if (capability.id !== PROFILE_IDS.generation) validateInput(capability, { ...input, code });
      else validateOutput(capability, { ...output, code }, input);
      if (capability.id === PROFILE_IDS.tests) validateOutput(capability, { ...output, tests: code }, input);
    }
    for (const code of ['a'.repeat(32769), '😀'.repeat(8192) + 'x']) {
      const error = code.startsWith('a') ? 'invalid_schema' : 'artifact_too_large';
      if (capability.id !== PROFILE_IDS.generation) rejects(() => validateInput(capability, { ...input, code }), error);
      else rejects(() => validateOutput(capability, { ...output, code }, input), error);
      if (capability.id === PROFILE_IDS.tests) rejects(() => validateOutput(capability, { ...output, tests: code }, input), error);
    }
    if (capability.id !== PROFILE_IDS.generation) rejects(() => validateInput(capability, { ...input, code: '' }), 'invalid_schema');
    const field = capability.id === PROFILE_IDS.generation ? 'code' : capability.id === PROFILE_IDS.tests ? 'tests' : 'summary';
    rejects(() => validateOutput(capability, { ...output, [field]: '' }, input), 'invalid_schema');
  }
});

test('Output: explanation/summary/scenarios boyutları, unittest sabiti ve bilinmeyen profil', () => {
  for (const [example, field] of [[generation, 'explanation'], [review, 'summary']]) {
    validateOutput(example.capability, { ...example.output, [field]: '😀'.repeat(2000) }, example.input);
    rejects(() => validateOutput(example.capability, { ...example.output, [field]: 'a'.repeat(2001) }, example.input), 'invalid_schema');
  }
  for (const scenarios of [['a'], Array(20).fill('a'.repeat(300))]) validateOutput(tests.capability, { ...tests.output, scenarios }, tests.input);
  for (const scenarios of [[], Array(21).fill('a'), [''], ['a'.repeat(301)]]) rejects(() => validateOutput(tests.capability, { ...tests.output, scenarios }, tests.input), 'invalid_schema');
  rejects(() => validateOutput(tests.capability, { ...tests.output, framework: 'pytest' }, tests.input), 'invalid_schema');
  for (const id of ['toString', '__proto__', 'other/profile', [PROFILE_IDS.review], null]) {
    rejects(() => validateInput({ id, version: VERSION }, generation.input), 'unsupported_profile');
    rejects(() => validateOutput({ id, version: VERSION }, review.output, review.input), 'unsupported_profile');
  }
});

test('Makine şemaları kaynakla aynı; dış ref/pattern yok ve export nesneleri değiştirilemez', () => {
  assert.deepEqual(functionSpecSchema, { $schema: 'http://json-schema.org/draft-07/schema#', ...definitions.functionSpec });
  for (const [id, kinds] of Object.entries(definitions.profiles)) for (const [kind, schema] of Object.entries(kinds)) {
    assert.deepEqual(schemas[id][kind], { $schema: 'http://json-schema.org/draft-07/schema#', ...schema });
    assert.doesNotMatch(JSON.stringify(schema), /"(?:\$ref|pattern|oneOf|anyOf|allOf)":/);
    assert.ok(Object.isFrozen(schemas[id][kind].properties));
  }
});

test('Bağımsız geliştirici: npm pack/install ile aynı 1.0.0 paketi, CJS/ESM ve TypeScript import', { timeout: 60000 }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'ifa-contract-consumer-'));
  const root = resolve(__dirname, '..');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  try {
    const packed = JSON.parse(execFileSync(npm, ['pack', './packages/code-demo-contracts', '--ignore-scripts', '--json', '--pack-destination', directory], { cwd: root, encoding: 'utf8' }))[0];
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'independent-consumer', version: '1.0.0', private: true, dependencies: { '@ifa/code-demo-contracts': `file:./${packed.filename}` } }));
    execFileSync(npm, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: directory, stdio: 'pipe' });
    const source = `const c = require('@ifa/code-demo-contracts'); const example = ${JSON.stringify(generation)}; if (c.VERSION !== '1.0.0') throw Error('version'); c.validateOutput(example.capability, example.output, example.input); require('@ifa/code-demo-contracts/schemas/function-spec.schema.json');`;
    execFileSync(process.execPath, ['-e', source], { cwd: directory });
    execFileSync(process.execPath, ['--input-type=module', '-e', `import { VERSION, validateInput } from '@ifa/code-demo-contracts'; if (VERSION !== '1.0.0' || typeof validateInput !== 'function') throw Error('exports');`], { cwd: directory });
    writeFileSync(join(directory, 'consumer.mts'), `import { VERSION, PROFILE_IDS, validateInput, validateOutput, type FunctionSpec } from '@ifa/code-demo-contracts';
const profile = { id: PROFILE_IDS.generation, version: VERSION };
const input = validateInput(profile, {});
const spec: FunctionSpec = input.spec;
const output = validateOutput(profile, {}, input);
const code: string = output.code;
// @ts-expect-error Test output cannot be treated as generation output
const passed: boolean = output.passed;
`);
    execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--target', 'ES2023', join(directory, 'consumer.mts')], { cwd: directory, stdio: 'pipe' });
    assert.equal(JSON.parse(readFileSync(join(directory, 'node_modules/@ifa/code-demo-contracts/package.json'))).version, VERSION);
    const lock = JSON.parse(readFileSync(join(directory, 'package-lock.json')));
    assert.equal(lock.packages['node_modules/@ifa/code-demo-contracts'].integrity, packed.integrity);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
