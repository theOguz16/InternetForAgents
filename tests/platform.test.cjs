const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { detectLanguage } = require('../dist/services/language/detect.js');
const { extractKeywords } = require('../dist/services/keywords/extract.js');
const { mountSpecialist } = require('../dist/services/shared/a2a.js');
const { registryRouter } = require('../dist/services/registry/router.js');
const { personalRouter } = require('../dist/services/personal/router.js');

test('Dil: iki dil, karışık metin, tekrar ve yetersiz kanıt', () => {
  for (const [text, expected] of [['Merhaba dünya', 'tr'], ['Hello world', 'en'], ['Merhaba hello', 'und'], ['hello hello hello', 'und'], ['123 !!!', 'und'], ['https://hello.world', 'und']]) {
    assert.equal(detectLanguage(text), expected, text);
  }
});
test('Kelimeler: sıklık, stop words, unicode, URL ve sınırlar', () => {
  assert.deepEqual(extractKeywords('Robot robot ve sensör'), ['robot', 'sensör']);
  assert.deepEqual(extractKeywords('İSTANBUL İstanbul Ankara’nın'), ['istanbul', 'ankara']);
  assert.deepEqual(extractKeywords('ve the https://example.com a@b.com'), []);
  assert.equal(extractKeywords('aa bb cc dd ee ff gg hh jj kk ll mm').length, 10);
});

async function serve(t, setup) {
  const app = express(); app.use(express.json({ limit: '64kb' }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  setup(app, base);
  return base;
}
async function post(url, body, headers = {}) {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
}
test('HTTP: kayıt → keşif → paralel A2A → kullanıcı SSE, idempotency ve kısmi başarı', { timeout: 20000 }, async t => {
  const origins = new Set();
  for (const role of ['language', 'keywords', 'summary']) {
    const { handler } = require(`../dist/services/${role}/handler.js`);
    origins.add(await serve(t, (app, base) => mountSpecialist(app, role, base, handler)));
  }
  const registry = await serve(t, app => app.use('/v1', registryRouter(origins)));
  for (const origin of origins) assert.equal((await post(`${registry}/v1/agents`, { cardUrl: `${origin}/.well-known/agent-card.json` })).status, 201);
  assert.equal((await post(`${registry}/v1/agents`, { cardUrl: 'http://example.com/.well-known/agent-card.json' })).status, 422);
  const personal = await serve(t, app => app.use('/v1', personalRouter(registry, origins)));
  const body = { text: 'Merhaba dünya robot robot ve sensör', skills: ['language', 'keywords', 'summary'] };
  const created = await post(`${personal}/v1/jobs`, body, { 'Idempotency-Key': 'first' });
  assert.equal(created.status, 202);
  const job = await created.json();
  const response = await fetch(`${personal}/v1/jobs/${job.id}/events`, { signal: AbortSignal.timeout(10000) });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const events = (await response.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
  const final = events.at(-1);
  assert.equal(final.status, 'completed', JSON.stringify(final));
  assert.equal(final.children.find(c => c.skill === 'language').output.output.language, 'tr');
  assert.equal(final.children.find(c => c.skill === 'keywords').output.output.keywords[0], 'robot');
  assert.equal(final.children.find(c => c.skill === 'summary').output.mode, 'fixture');
  const repeated = await post(`${personal}/v1/jobs`, body, { 'Idempotency-Key': 'first' });
  assert.equal(repeated.status, 200); assert.equal((await repeated.json()).id, job.id);
  assert.equal((await post(`${personal}/v1/jobs`, { ...body, text: 'different' }, { 'Idempotency-Key': 'first' })).status, 409);
  // Yalnız dil sağlayıcısı görünür: diğer işin hatası başarılı sonucu kaybettirmemeli.
  const partial = await serve(t, app => app.use('/v1', personalRouter(registry, new Set([[...origins][0]]))));
  const partialJob = await (await post(`${partial}/v1/jobs`, body, { 'Idempotency-Key': 'partial' })).json();
  const stream = await fetch(`${partial}/v1/jobs/${partialJob.id}/events`, { signal: AbortSignal.timeout(10000) });
  const snapshots = (await stream.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
  assert.equal(snapshots.at(-1).status, 'partial');
});

test('SQLite: Personal iş/anahtar geri yükleme ve yarım işi tekrar göndermeme', async t => {
  const { mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const { createHash } = require('node:crypto');
  const { PersonalStore } = require('../dist/services/personal/store.js');
  const dir = mkdtempSync(join(tmpdir(), 'ifa-personal-'));
  const path = join(dir, 'jobs.sqlite');
  const body = { text: 'Merhaba dünya', skills: ['language'] };
  const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  let store = new PersonalStore(path);
  const completed = { id: 'done', status: 'completed', revision: 3, createdAt: new Date().toISOString(), children: [{ skill: 'language', state: 'completed', output: { profile: 'text-language.v1', mode: 'deterministic', output: { language: 'tr' } } }] };
  store.save({ jobs: [['done', completed], ['pending', { ...completed, id: 'pending', status: 'running', children: [{ skill: 'language', state: 'working' }] }]], keys: [['repeat', { hash, jobId: 'done' }]] });
  store.close();
  store = new PersonalStore(path);
  const personal = await serve(t, app => app.use('/v1', personalRouter('http://127.0.0.1:1', new Set(), store)));
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const restored = await (await fetch(`${personal}/v1/jobs/done`)).json();
  assert.deepEqual(restored, completed);
  const pending = await (await fetch(`${personal}/v1/jobs/pending`)).json();
  assert.equal(pending.status, 'unknown');
  assert.equal(pending.children[0].error, 'personal_restarted');
  const duplicate = await post(`${personal}/v1/jobs`, body, { 'Idempotency-Key': 'repeat' });
  assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).id, 'done');
  assert.equal(store.load().jobs.length, 2);
});

test('SQLite: uzman sonucu kalıcı; aktif görev yeniden açılınca kesildi olarak işaretlenir', async () => {
  const { mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const { SqliteTaskStore } = require('../dist/services/shared/task-store.js');
  const { Task, TaskState } = require('@a2a-js/sdk');
  const dir = mkdtempSync(join(tmpdir(), 'ifa-task-'));
  const path = join(dir, 'tasks.sqlite');
  let store = new SqliteTaskStore(path);
  const context = { tenant: 'local', user: { userName: 'demo' } };
  try {
    const done = Task.fromJSON({ id: 'done', contextId: 'context', status: { state: TaskState.TASK_STATE_COMPLETED }, artifacts: [{ artifactId: 'result', parts: [{ mediaType: 'application/json', data: { value: 'saved' } }] }] });
    await store.save(done, context);
    await store.save(Task.fromJSON({ id: 'working', status: { state: TaskState.TASK_STATE_WORKING } }), context);
    store.close(); store = new SqliteTaskStore(path);
    assert.deepEqual(Task.toJSON(await store.load('done', context)), Task.toJSON(done));
    const interrupted = await store.load('working', context);
    assert.equal(interrupted.status.state, TaskState.TASK_STATE_FAILED);
    assert.equal(interrupted.metadata.recoveryReason, 'executor_restarted');
    assert.equal(await store.load('done', { tenant: 'other', user: { userName: 'demo' } }), undefined);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('Registry SQLite: yeniden açılma, kimlik koruma ve kaldırılan ağ izni', async t => {
  const { mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const { RegistryStore } = require('../dist/services/registry/store.js');
  const dir = mkdtempSync(join(tmpdir(), 'ifa-registry-'));
  const path = join(dir, 'registry.sqlite');
  let store = new RegistryStore(path);
  const agent = await serve(t, (app, base) => mountSpecialist(app, 'language', base, require('../dist/services/language/handler.js').handler));
  const allowed = new Set([agent]);
  const registry = await serve(t, app => app.use('/v1', registryRouter(allowed, store)));
  const body = { cardUrl: `${agent}/.well-known/agent-card.json` };
  const first = await post(`${registry}/v1/agents`, body);
  assert.equal(first.status, 201);
  const original = await first.json();
  store.close(); store = new RegistryStore(path);
  const restored = await serve(t, app => app.use('/v1', registryRouter(allowed, store)));
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const discovery = await (await fetch(`${restored}/v1/agents?profile=text-language.v1`)).json();
  assert.equal(discovery.storage, 'sqlite'); assert.deepEqual(discovery.agents, [original]);
  const duplicate = await post(`${restored}/v1/agents`, body);
  assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).id, original.id);
  assert.equal(store.list().length, 1);
  allowed.clear();
  assert.deepEqual((await (await fetch(`${restored}/v1/agents`)).json()).agents, []);
  assert.equal((await fetch(`${restored}/v1/agents/${original.id}`)).status, 404);
  assert.equal(store.list().length, 1); // İzin değişimi veriyi silmez, yalnız görünürlüğü kısıtlar.
});
