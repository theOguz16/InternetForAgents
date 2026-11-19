const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { parseWorkflow } = require('../dist/services/personal/application/workflow-definition.js');
const { pointerSegments } = require('../dist/services/personal/domain/workflow.js');
const { workflowSchema } = require('../dist/services/shared/workflow-contract.js');

const root = join(__dirname, '..');
const example = JSON.parse(readFileSync(join(root, 'examples', 'workflows', 'code-review-tests.json'), 'utf8'));
const clone = () => structuredClone(example);
const codes = result => (result.ok ? [] : result.errors.map(e => e.code));
const step = (id, input, extra = {}) => ({
  id, capability: { id: 'team/x', version: '1.0.0' }, requires: { sideEffects: 'none' },
  input, outputs: ['/out'], budget: { timeoutMs: 1000, maxOutputBytes: 10 }, required: true, ...extra,
});
const wf = steps => ({ workflowVersion: 'ifa-workflow.v1', id: 'team/wf', version: '1.0.0', title: 't', steps });
const fromInput = { source: 'input', pointer: '/x' };
const fromStep = (s, pointer = '/out') => ({ source: 'step', step: s, pointer });

test('D02: örnek code workflow parse edilir; sıra bağımlılığa ve tanım sırasına uyar', () => {
  const result = parseWorkflow(example);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.order, ['generate', 'review', 'tests']);
  // Bağımlılık tanım sırasından bağımsız: ters yazılsa da üretici önce gelir.
  const reversed = clone(); reversed.steps.reverse();
  assert.deepEqual(parseWorkflow(reversed).order, ['generate', 'tests', 'review']);
});

test('D02: döngü, kendine referans ve bilinmeyen adım reddedilir', () => {
  const cycle = parseWorkflow(wf([step('a', { x: fromStep('c') }), step('b', { x: fromStep('a') }), step('c', { x: fromStep('b') })]));
  assert.deepEqual(codes(cycle), ['cycle']);
  assert.equal(cycle.errors[0].detail, 'a -> c -> b -> a');
  assert.deepEqual(codes(parseWorkflow(wf([step('a', { x: fromStep('a') })]))), ['self_reference']);
  const unknown = parseWorkflow(wf([step('a', { x: fromStep('ghost') })]));
  assert.deepEqual(codes(unknown), ['unknown_step']);
  assert.equal(unknown.errors[0].path, '/steps/0/input/x/step');
  assert.deepEqual(codes(parseWorkflow(wf([step('a', fromInput && { x: fromInput }), step('a', { x: fromInput })]))), ['duplicate_step']);
});

test('D02: eksik kaynak alanı reddedilir; yalnız açılan çıktı ve altı okunabilir', () => {
  const missing = clone(); missing.steps[1].input.code.pointer = '/explanation';
  const result = parseWorkflow(missing);
  assert.deepEqual(codes(result), ['unknown_source_field']);
  assert.equal(result.errors[0].detail, 'generate/explanation');
  // Açılmış alanın alt alanı okunabilir; benzer önekli kardeş alan okunamaz.
  assert.equal(parseWorkflow(wf([step('a', { x: fromInput }, { outputs: ['/items'] }), step('b', { x: fromStep('a', '/items/0') })])).ok, true);
  assert.deepEqual(codes(parseWorkflow(wf([step('a', { x: fromInput }, { outputs: ['/co'] }), step('b', { x: fromStep('a', '/code') })]))), ['unknown_source_field']);
  assert.deepEqual(codes(parseWorkflow(wf([step('a', { x: { source: 'step', pointer: '/out' } })]))), ['missing_step_ref']);
  assert.deepEqual(codes(parseWorkflow(wf([step('a', { x: { source: 'input', step: 'a', pointer: '/x' } })]))), ['unexpected_step_ref']);
});

test('D02: güvensiz ifade/pointer reddedilir; yalnız RFC 6901 pointer kabul edilir', () => {
  for (const pointer of ['${input.spec}', 'spec', '/a/~2', '/a~', `/${'a/'.repeat(8)}a`, `/${'x'.repeat(300)}`]) {
    const result = parseWorkflow(wf([step('a', { x: { source: 'input', pointer } })]));
    assert.ok(codes(result).some(c => c === 'invalid_pointer' || c === 'invalid_workflow'), `${pointer} -> ${JSON.stringify(codes(result))}`);
  }
  for (const pointer of ['/__proto__/polluted', '/constructor/prototype', '/a/prototype']) {
    assert.deepEqual(codes(parseWorkflow(wf([step('a', { x: { source: 'input', pointer } })]))), ['unsafe_pointer'], pointer);
  }
  assert.deepEqual(codes(parseWorkflow(wf([step('a', { x: fromInput }, { outputs: ['/__proto__'] })]))), ['unsafe_pointer']);
  // İfade yerine nesne, fonksiyon kaynağı veya ek alan şema düzeyinde reddedilir.
  for (const mapping of [{ source: 'expr', pointer: '/x' }, { source: 'input', pointer: '/x', eval: '1+1' }, '/x', { $ref: '#/x' }]) {
    assert.deepEqual([...new Set(codes(parseWorkflow(wf([step('a', { x: mapping })]))))], ['invalid_workflow'], JSON.stringify(mapping));
  }
  assert.deepEqual(pointerSegments('/a~1b/c~0d'), ['a/b', 'c~d']);
  assert.deepEqual(pointerSegments(''), []);
  assert.equal(Object.prototype.polluted, undefined);
});

test('D02: şema sınırları, yan etki, bütçe ve zorunlu→isteğe bağlı çelişkisi', () => {
  const bad = (mutate) => { const w = clone(); mutate(w); return [...new Set(codes(parseWorkflow(w)))]; };
  assert.deepEqual(bad(w => { w.steps[0].requires.sideEffects = 'network'; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.steps[0].budget.timeoutMs = 60001; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.steps[0].budget.maxOutputBytes = 131073; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.steps[0].capability.version = '1.0'; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.steps[0].id = 'Generate'; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.steps[0].input = {}; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.extra = true; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.workflowVersion = 'ifa-workflow.v2'; }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.steps = Array.from({ length: 17 }, (_, i) => step(`s${i}`, { x: fromInput })); }), ['invalid_workflow']);
  assert.deepEqual(bad(w => { w.steps[0].required = false; }), ['required_depends_on_optional'], 'tests zorunlu, generate isteğe bağlı olamaz');
  assert.deepEqual(codes(parseWorkflow({ ...wf([step('a', { x: fromInput })]), title: 'x'.repeat(70000) })), ['workflow_too_large']);
  for (const value of [null, 'workflow', [], 42]) assert.equal(parseWorkflow(value).ok, false);
});

test('D02: yayımlanan şema dosyası çalışma anı tanımıyla aynı; domain saf', () => {
  const published = JSON.parse(readFileSync(join(root, 'schemas', 'ifa-workflow.v1.schema.json'), 'utf8'));
  const { $schema, $id, ...rest } = published;
  assert.equal($schema, 'http://json-schema.org/draft-07/schema#');
  assert.deepEqual(rest, JSON.parse(JSON.stringify(workflowSchema)));
  const domain = readFileSync(join(root, 'services', 'personal', 'domain', 'workflow.ts'), 'utf8');
  assert.equal(/^\s*import\s/m.test(domain), false, 'workflow domain hiçbir şey import etmez');
});
