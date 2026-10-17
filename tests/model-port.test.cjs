const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { FixtureBackend } = require('../dist/services/model/port.js');
const { ModelQueue } = require('../dist/services/model/queue.js');
const { OllamaBackend } = require('../dist/services/model/ollama.js');
const { createModelApp } = require('../dist/services/model/server.js');
const token = 'test-only-model-gateway-token';
const pause = ms => new Promise(r => setTimeout(r, ms));
async function listen(t, app) {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });
  return `http://127.0.0.1:${server.address().port}`;
}
test('B08: model olmadan fixture; auth, payload ve HTTP sözleşmesi', async t => {
  const base = await listen(t, createModelApp(new FixtureBackend(), token));
  const send = (body, auth = token) => fetch(`${base}/v1/generate`, { method: 'POST', headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await send({ prompt: 'hello' }, 'wrong')).status, 401);
  for (const body of [{}, { prompt: '' }, { prompt: 'x', model: 'injected' }, { prompt: 'ğ'.repeat(8193) }]) assert.equal((await send(body)).status, 400);
  assert.equal((await send({ prompt: 'x'.repeat(40000) })).status, 413);
  const response = await send({ prompt: 'hello' }); const reply = await response.json();
  assert.equal(response.status, 200); assert.equal(reply.mode, 'fixture'); assert.equal(reply.usage.inputTokens, null);
  assert.equal(reply.text, '{"answer":"fixture"}'); assert.ok(reply.timing.totalMs >= 0);
});
test('B08: FIFO concurrency=1, bounded queue ve kuyruk bekleme ölçümü', async () => {
  let active = 0, peak = 0; const order = [];
  const fixture = new FixtureBackend();
  const backend = { cancellationCertain: true, async generate(input, signal) { active++; peak = Math.max(peak, active); order.push(input.prompt); await pause(15); active--; return fixture.generate(input, signal); } };
  const queue = new ModelQueue(backend, 1, 1000);
  const first = queue.submit({ prompt: 'first' }); const second = queue.submit({ prompt: 'second' });
  await assert.rejects(queue.submit({ prompt: 'third' }), { code: 'queue_full' });
  const results = await Promise.all([first, second]); assert.equal(peak, 1); assert.deepEqual(order, ['first', 'second']); assert.ok(results[1].timing.queueMs > 0);
});
test('B08: deadline kuyruk dahil; uzak timeout yeni işi bloke eder', async () => {
  let calls = 0;
  const queue = new ModelQueue({ cancellationCertain: false, async generate() { calls++; await pause(50); return new FixtureBackend().generate({}, new AbortController().signal); } }, 2, 20);
  const results = await Promise.allSettled([queue.submit({ prompt: 'a' }), queue.submit({ prompt: 'b' })]);
  assert.equal(results[0].reason.code, 'deadline_exceeded'); assert.equal(results[1].reason.code, 'backend_reconciliation_required');
  await pause(60); assert.equal(calls, 1); assert.equal(queue.status().blocked, true);
  await assert.rejects(queue.submit({ prompt: 'c' }), { code: 'backend_reconciliation_required' });
});
test('B08: queued cancellation slotu tüketmez; active cancellation belirsiz işi bloke eder', async () => {
  const backend = { cancellationCertain: false, async generate() { await pause(30); return new FixtureBackend().generate({}, new AbortController().signal); } };
  const queue = new ModelQueue(backend, 1, 1000); const active = new AbortController(); const queued = new AbortController();
  const first = queue.submit({ prompt: 'a' }, active.signal); const second = queue.submit({ prompt: 'b' }, queued.signal);
  const rejectedSecond = assert.rejects(second, { code: 'cancelled' }); queued.abort(); await rejectedSecond;
  assert.equal(queue.status().waiting, 0); assert.equal(queue.status().blocked, false);
  const rejectedFirst = assert.rejects(first, { code: 'cancelled' }); active.abort(); await rejectedFirst;
  assert.equal(queue.status().blocked, true); await pause(40);
});
test('B08: Ollama gerçek HTTP adaptörü; pin, metrik, redirect ve hata sınırları', async t => {
  let digest = 'a'.repeat(64); let responseMode = 'valid'; let dispatches = 0;
  const api = express(); api.use(express.json());
  api.get('/api/tags', (_q, r) => r.json({ models: [{ name: 'local:test', digest }] }));
  api.get('/api/version', (_q, r) => r.json({ version: 'test-version' }));
  api.get('/api/ps', (_q, r) => r.json({ models: [{ digest, size: 100, size_vram: 50 }] }));
  api.post('/api/generate', (q, r) => {
    dispatches++; assert.equal(q.body.stream, false); assert.equal(q.body.options.num_ctx, 2048);
    if (responseMode === 'redirect') { r.redirect('/secret'); return; }
    if (responseMode === 'large') { r.send('x'.repeat(262145)); return; }
    r.json({ model: 'local:test', done: true, done_reason: responseMode === 'length' ? 'length' : 'stop', response: 'answer', prompt_eval_count: 4, eval_count: 2 });
  });
  const origin = await listen(t, api);
  const backend = new OllamaBackend({ origin, model: 'local:test', digest, context: 2048, maxTokens: 512, seed: 42 });
  const base = await listen(t, createModelApp(backend, token));
  const response = await fetch(`${base}/v1/generate`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'hello' }) });
  const value = await response.json(); assert.equal(response.status, 200); assert.equal(value.text, 'answer'); assert.equal(value.mode, 'model');
  assert.deepEqual(value.usage, { inputTokens: 4, outputTokens: 2 }); assert.deepEqual(value.resources, { modelBytes: 100, vramBytes: 50 });
  digest = 'b'.repeat(64); await assert.rejects(backend.generate({ prompt: 'x' }, AbortSignal.timeout(1000)), { code: 'model_pin_mismatch' }); assert.equal(dispatches, 1);
  digest = 'a'.repeat(64);
  responseMode = 'length'; await assert.rejects(backend.generate({ prompt: 'x' }, AbortSignal.timeout(1000)), { code: 'output_truncated' });
  for (const mode of ['redirect', 'large']) { responseMode = mode; await assert.rejects(backend.generate({ prompt: 'x' }, AbortSignal.timeout(1000)), { code: 'backend_outcome_unknown' }); }
  assert.throws(() => new OllamaBackend({ origin: 'http://example.com', model: 'local:test', digest, context: 2048, maxTokens: 512, seed: 42 }), /local_backend_required/);
});
test('B08: EVAL-M1 model/options ve qualification dosyaları holdout öncesi sabit', () => {
  const { checkFreeze } = require('../scripts/check-model-freeze.cjs');
  assert.equal(checkFreeze().model.concurrency, 1);
});
test('B08: iptali yoksayan fixture slotu erken bırakmaz; bekleyen iş kendi deadline ile biter', async () => {
  let calls = 0;
  const queue = new ModelQueue({ cancellationCertain: true, async generate() { calls++; await pause(60); return new FixtureBackend().generate({}, new AbortController().signal); } }, 1, 15);
  const results = await Promise.allSettled([queue.submit({ prompt: 'a' }), queue.submit({ prompt: 'b' })]);
  assert.deepEqual(results.map(r => r.reason.code), ['deadline_exceeded', 'deadline_exceeded']);
  assert.equal(calls, 1); assert.equal(queue.status().active, true);
  await pause(70); assert.equal(queue.status().active, false); assert.equal(queue.status().blocked, false);
});
test('B08: belirsiz backend ağ hatası otomatik retry/dispatch üretmez', async () => {
  const { ModelError } = require('../dist/services/model/port.js');
  let calls = 0;
  const queue = new ModelQueue({ cancellationCertain: false, async generate() { calls++; throw new ModelError('backend_outcome_unknown'); } });
  const results = await Promise.allSettled([queue.submit({ prompt: 'a' }), queue.submit({ prompt: 'b' })]);
  assert.deepEqual(results.map(r => r.reason.code), ['backend_outcome_unknown', 'backend_reconciliation_required']); assert.equal(calls, 1);
});
