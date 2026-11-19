const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { JobService } = require('../dist/services/personal/application/job-service.js');
const { DiscoveryError } = require('../dist/services/personal/application/ports.js');
const { JsonLineTelemetry } = require('../dist/services/personal/infrastructure/json-line-telemetry.js');
const { personalRouter } = require('../dist/services/personal/router.js');
const { IdentityService } = require('../dist/services/identity/application/identity-service.js');
const { SqliteIdentityStore } = require('../dist/services/identity/infrastructure/sqlite-identity-store.js');
const { authenticate, SESSION_COOKIE } = require('../dist/services/identity/http/authenticate.js');
const { sessionRouter } = require('../dist/services/identity/http/session-router.js');
const { LOCAL_DEMO_PRINCIPAL } = require('../dist/services/identity/domain/principal.js');

const ALLOWED_KEYS = new Set([
  'at', 'event', 'traceId', 'jobId', 'childId', 'agentId', 'remoteTaskId', 'outcome', 'errorCode', 'durationMs',
]);

function memoryRepository(initial = { jobs: [], keys: [] }) {
  let state = structuredClone(initial);
  return { load: () => structuredClone(state), save(next) { state = structuredClone(next); }, get state() { return state; } };
}

function createHarness(overrides = {}) {
  const lines = [];
  const telemetry = overrides.telemetry ?? new JsonLineTelemetry({ write: line => lines.push(line) });
  let now = new Date('2026-11-19T12:00:00.000Z');
  let jobSeq = 0;
  let traceSeq = 0;
  const advance = ms => { now = new Date(now.getTime() + ms); };
  const clock = { now: () => now };
  const directory = {
    async find(profile, signal) {
      advance(overrides.discoverMs ?? 15);
      if (overrides.find) return overrides.find(profile, signal);
      return [{ id: `agent-${profile}`, name: `Agent ${profile}`, endpoint: 'http://agent.test/a2a', profiles: [profile] }];
    },
  };
  const gateway = {
    async connect(provider, profile, signal) {
      if (overrides.connect) await overrides.connect(provider, profile, signal);
      return {
        async execute(text, hooks) {
          advance(overrides.executeMs ?? 25);
          if (overrides.execute) return overrides.execute(profile, text, hooks, signal);
          const taskId = `task-${profile}-${jobSeq}`;
          hooks.taskIdentified(taskId);
          // Yinelenen taskIdentified bildirimi ikinci step.remote_task üretmemeli.
          hooks.taskIdentified(taskId);
          hooks.progressed();
          return { terminal: 'completed', result: { profile, mode: 'deterministic', output: overrides.output ?? { ok: true } } };
        },
      };
    },
  };
  const repository = overrides.repository ?? memoryRepository();
  const real = new JobService({
    repository,
    clock,
    newId: () => `job-${++jobSeq}`,
    newTraceId: () => `trace-${++traceSeq}`,
    directory,
    gateway,
    allowedOrigins: new Set(['http://agent.test']),
    telemetry,
    deadlineMs: overrides.deadlineMs,
  });
  const parsed = () => lines.map(line => JSON.parse(line));
  return { real, telemetry, lines, parsed, advance, repository };
}

const finished = (service, id, principal = LOCAL_DEMO_PRINCIPAL, timeoutMs = 5000) => new Promise((resolve, reject) => {
  // Önce abone olunur, sonra mevcut durum okunur; HTTP yanıtı gelene kadar biten
  // işlerde kaçırılmış olay yüzünden test sonsuza kadar beklemez.
  let done = false;
  const finish = (job, err) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    off();
    if (err) reject(err);
    else resolve(job);
  };
  const off = service.subscribe(id, job => {
    if (job.status !== 'running') finish(job);
  });
  const timer = setTimeout(() => finish(undefined, new Error(`job ${id} ${timeoutMs}ms içinde bitmedi`)), timeoutMs);
  const current = service.get(principal, id);
  if (current && current.status !== 'running') finish(current);
});

const findMetric = (list, name, labels = {}) => list.find(entry => {
  if (entry.name !== name) return false;
  const keys = Object.keys(entry.labels);
  const expectedKeys = Object.keys(labels);
  return keys.length === expectedKeys.length && expectedKeys.every(k => entry.labels[k] === labels[k]);
});

test('H02 sentetik trace: tek traceId ile accepted → discovered → dispatched → remote_task → finished zinciri ve metrikler', async () => {
  const { real, telemetry, lines, parsed } = createHarness();
  const submitted = real.submit(LOCAL_DEMO_PRINCIPAL, 'k-success', { text: 'Merhaba dünya', skills: ['language', 'keywords'] });
  assert.equal(submitted.kind, 'accepted');
  const done = await finished(real, submitted.job.id);
  assert.equal(done.status, 'completed');

  const events = parsed();
  assert.ok(lines.every(line => !line.includes('\n')), 'her kayıt tek satır NDJSON olmalı');
  for (const ev of events) {
    assert.equal(ev.traceId, 'trace-1');
    assert.equal(ev.jobId, 'job-1');
    for (const key of Object.keys(ev)) assert.ok(ALLOWED_KEYS.has(key), `izin dışı anahtar: ${key}`);
    assert.equal(Object.hasOwn(ev, 'service'), false, 'service alanı olay satırında olmamalı');
  }
  assert.equal(events[0].event, 'job.accepted');
  assert.equal(events[0].outcome, 'accepted');
  assert.equal(events.at(-1).event, 'job.finished');
  assert.equal(events.at(-1).outcome, 'completed');
  assert.ok(events.at(-1).durationMs >= 0);

  for (const skill of ['keywords', 'language']) {
    const stepEvents = events.filter(ev => ev.childId === skill);
    assert.deepEqual(
      stepEvents.map(ev => ev.event),
      ['step.discovered', 'step.dispatched', 'step.remote_task', 'step.finished'],
      `${skill} adım zinciri tam ve yinelenmesiz olmalı`,
    );
    assert.equal(stepEvents[0].outcome, 'selected');
    assert.equal(stepEvents[0].agentId, `agent-text-${skill}.v1`);
    assert.equal(stepEvents[2].remoteTaskId, `task-text-${skill}.v1-1`);
    assert.equal(stepEvents[3].outcome, 'completed');
    assert.ok(stepEvents[3].durationMs > 0);
  }

  const snap = telemetry.metricsSnapshot();
  assert.equal(findMetric(snap.counters, 'personal_job_submissions_total', { outcome: 'accepted', errorCode: 'none' }).value, 1);
  assert.equal(findMetric(snap.counters, 'personal_jobs_total', { outcome: 'completed' }).value, 1);
  assert.equal(findMetric(snap.histograms, 'personal_job_duration_ms', { outcome: 'completed' }).count, 1);
  assert.equal(findMetric(snap.histograms, 'personal_job_queue_wait_ms', {}).count, 1);
  assert.equal(findMetric(snap.gauges, 'personal_jobs_running', {}).value, 0);
  for (const skill of ['keywords', 'language']) {
    assert.equal(findMetric(snap.counters, 'personal_steps_total', { skill, outcome: 'completed', errorCode: 'none' }).value, 1);
    assert.equal(findMetric(snap.histograms, 'personal_step_duration_ms', { skill, outcome: 'completed' }).count, 1);
  }
});

test('H02 kısmi başarı ve hata yolları: tek traceId korunur; gönderim öncesi hatada dispatched üretilmez', async () => {
  // Kısmi başarı: language completed, keywords execution_unknown, summary no_provider
  const partial = createHarness({
    find(profile) {
      if (profile === 'text-summary.v1') return [];
      return [{ id: `agent-${profile}`, name: profile, endpoint: 'http://agent.test/a2a', profiles: [profile] }];
    },
    execute(profile, _text, hooks) {
      hooks.taskIdentified(`remote-${profile}`);
      hooks.progressed();
      if (profile === 'text-keywords.v1') throw new Error('stream_broken');
      return { terminal: 'completed', result: { profile, mode: 'deterministic', output: { language: 'tr' } } };
    },
  });
  const pSub = partial.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-partial', { text: 'Merhaba', skills: ['language', 'keywords', 'summary'] });
  const pDone = await finished(partial.real, pSub.job.id);
  assert.equal(pDone.status, 'partial');
  const pEvents = partial.parsed();
  assert.ok(pEvents.every(ev => ev.traceId === 'trace-1' && ev.jobId === 'job-1'));

  const summaryEvents = pEvents.filter(ev => ev.childId === 'summary');
  assert.deepEqual(summaryEvents.map(ev => ev.event), ['step.discovered', 'step.finished']);
  assert.deepEqual([summaryEvents[0].outcome, summaryEvents[0].errorCode], ['failed', 'no_provider']);
  assert.deepEqual([summaryEvents[1].outcome, summaryEvents[1].errorCode], ['failed', 'no_provider']);

  const kwEvents = pEvents.filter(ev => ev.childId === 'keywords');
  assert.deepEqual(kwEvents.map(ev => ev.event), ['step.discovered', 'step.dispatched', 'step.remote_task', 'step.finished']);
  assert.deepEqual([kwEvents[3].outcome, kwEvents[3].errorCode], ['unknown', 'execution_unknown']);
  assert.equal(pEvents.at(-1).event, 'job.finished');
  assert.equal(pEvents.at(-1).outcome, 'partial');

  // Bağlantı hatası: discovered selected olur ama dispatched olmaz -> failed / discovery_failed
  const connectFail = createHarness({
    connect() { throw new Error('card_unreachable'); },
  });
  const cSub = connectFail.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-conn', { text: 'Merhaba', skills: ['language'] });
  const cDone = await finished(connectFail.real, cSub.job.id);
  assert.equal(cDone.status, 'failed');
  const cEvents = connectFail.parsed();
  assert.deepEqual(cEvents.map(ev => ev.event), ['job.accepted', 'step.discovered', 'step.finished', 'job.finished']);
  assert.deepEqual([cEvents[2].outcome, cEvents[2].errorCode], ['failed', 'discovery_failed']);
  assert.equal(cEvents[3].outcome, 'failed');

  // Sağlayıcı hatası (provider_failed) ve süre aşımı (deadline_exceeded)
  const providerFail = createHarness({
    execute: () => ({ terminal: 'failed' }),
  });
  const fSub = providerFail.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-pf', { text: 'Merhaba', skills: ['language'] });
  assert.equal((await finished(providerFail.real, fSub.job.id)).status, 'failed');
  const fEvents = providerFail.parsed();
  assert.equal(fEvents.find(ev => ev.event === 'step.finished').errorCode, 'provider_failed');

  const deadlineFail = createHarness({
    deadlineMs: 10,
    find(_profile, signal) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DiscoveryError('discovery_failed')), { once: true });
      });
    },
  });
  const dSub = deadlineFail.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-dl', { text: 'Merhaba', skills: ['language'] });
  assert.equal((await finished(deadlineFail.real, dSub.job.id)).status, 'failed');
  const dEvents = deadlineFail.parsed();
  assert.deepEqual(dEvents.map(ev => ev.event), ['job.accepted', 'step.discovered', 'step.finished', 'job.finished']);
  assert.equal(dEvents[1].errorCode, 'deadline_exceeded');
  assert.equal(dEvents[2].errorCode, 'deadline_exceeded');

  // Reddedilen submit ve idempotent tekrar sayaçları (job.accepted üretmez)
  const beforeLines = partial.lines.length;
  assert.deepEqual(partial.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-partial', { text: 'Merhaba', skills: ['language', 'keywords', 'summary'] }).kind, 'existing');
  assert.deepEqual(partial.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-partial', { text: 'Farklı', skills: ['language', 'keywords', 'summary'] }), { kind: 'error', code: 'idempotency_conflict' });
  assert.deepEqual(partial.real.submit(LOCAL_DEMO_PRINCIPAL, '', { text: 'Merhaba', skills: ['language'] }), { kind: 'error', code: 'invalid_idempotency_key' });
  assert.equal(partial.lines.length, beforeLines, 'existing ve reddedilen submit trace olayı üretmemeli');
  const pSnap = partial.telemetry.metricsSnapshot();
  assert.equal(findMetric(pSnap.counters, 'personal_job_submissions_total', { outcome: 'existing', errorCode: 'none' }).value, 1);
  assert.equal(findMetric(pSnap.counters, 'personal_job_submissions_total', { outcome: 'rejected', errorCode: 'idempotency_conflict' }).value, 1);
  assert.equal(findMetric(pSnap.counters, 'personal_job_submissions_total', { outcome: 'rejected', errorCode: 'invalid_idempotency_key' }).value, 1);
});

test('H02 TH06 negatif test: secrets, metin, çıktı, cookie, CSRF ve ownerId loglarda geçmez; allowlist dışı alan atılır', async t => {
  const lines = [];
  const telemetry = new JsonLineTelemetry({ write: line => lines.push(line) });
  // Gizli tarayıcı yanlış pozitiflerini önlemek için düşük entropili sentinel değerleri kullanılır.
  const sentinelText = 'sentinel-user-text';
  const sentinelOutput = 'sentinel-artifact-output';
  const sentinelPrincipalName = 'sentinel-principal-name';

  const identity = new IdentityService(new SqliteIdentityStore(':memory:'), { now: () => new Date('2026-11-19T12:00:00.000Z') });
  const { principal, token } = identity.createPrincipal(sentinelPrincipalName, 'user');

  const directory = {
    async find(profile) { return [{ id: `a-${profile}`, name: 'Uzman', endpoint: 'http://agent.test/a2a', profiles: [profile] }]; },
  };
  const gateway = {
    async connect(_provider, profile) {
      return {
        async execute(_text, hooks) {
          hooks.taskIdentified(`rt-${profile}`);
          hooks.progressed();
          return { terminal: 'completed', result: { profile, mode: 'deterministic', output: { summary: sentinelOutput } } };
        },
      };
    },
  };
  const jobs = new JobService({
    repository: memoryRepository(),
    clock: { now: () => new Date('2026-11-19T12:00:00.000Z') },
    directory,
    gateway,
    allowedOrigins: new Set(['http://agent.test']),
    telemetry,
  });

  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use('/v1', sessionRouter(identity, { secure: false }));
  app.use('/v1', authenticate(identity, 'required'), personalRouter(jobs));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  // 1) Bearer token akışı
  const r1 = await fetch(`${base}/v1/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'Idempotency-Key': 'bearer-1' },
    body: JSON.stringify({ text: sentinelText, skills: ['summary'] }),
  });
  assert.equal(r1.status, 202);
  const j1 = await r1.json();
  await finished(jobs, j1.id, principal);

  // 2) Cookie + CSRF akışı
  const login = await fetch(`${base}/v1/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  assert.equal(login.status, 201);
  const setCookie = login.headers.getSetCookie()[0];
  const cookiePair = setCookie.split(';')[0];
  const sessionCookieValue = cookiePair.slice(`${SESSION_COOKIE}=`.length);
  const { csrfToken } = await login.json();

  const r2 = await fetch(`${base}/v1/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookiePair, 'x-csrf-token': csrfToken, 'Idempotency-Key': 'cookie-1' },
    body: JSON.stringify({ text: sentinelText, skills: ['summary'] }),
  });
  assert.equal(r2.status, 202);
  const j2 = await r2.json();
  await finished(jobs, j2.id, principal);

  assert.ok(lines.length >= 10, 'iki işin tüm trace olayları kaydedilmiş olmalı');
  const forbiddenValues = [sentinelText, sentinelOutput, token, sessionCookieValue, csrfToken, sentinelPrincipalName, principal.id];
  for (const line of lines) {
    for (const forbidden of forbiddenValues) {
      assert.equal(line.includes(forbidden), false, `log satırı gizli değer sızdırmamalı: ${forbidden}`);
    }
    const obj = JSON.parse(line);
    for (const key of Object.keys(obj)) assert.ok(ALLOWED_KEYS.has(key), `allowlist dışı alan: ${key}`);
  }

  // 3) Doğrudan allowlist filtresi ve uzun alan kesme testi
  const directLines = [];
  const direct = new JsonLineTelemetry({ write: line => directLines.push(line) });
  direct.event({
    at: '2026-11-19T12:00:00.000Z',
    event: 'step.remote_task',
    traceId: 't-direct',
    jobId: 'j-direct',
    childId: 'language',
    agentId: 'a-1',
    remoteTaskId: 'x'.repeat(500),
    outcome: 'identified',
    text: sentinelText,
    output: { leak: sentinelOutput },
    token,
    cookie: sessionCookieValue,
    csrfToken,
    ownerId: principal.id,
    principal: { id: principal.id, name: sentinelPrincipalName },
    authorization: `Bearer ${token}`,
    service: 'personal',
    extraField: 'yasak',
  });
  assert.equal(directLines.length, 1);
  const sanitized = JSON.parse(directLines[0]);
  assert.deepEqual(Object.keys(sanitized).sort(), ['agentId', 'at', 'childId', 'event', 'jobId', 'outcome', 'remoteTaskId', 'traceId']);
  assert.equal(sanitized.remoteTaskId.length, 256);
});

test('H02 cardinality sınırı: farklı jobId/agentId yeni seri üretmez; bilinmeyen etiketler other olur', async () => {
  let agentSeq = 0;
  const { real, telemetry } = createHarness({
    find(profile) {
      return [{ id: `agent-${++agentSeq}-${profile}`, name: 'A', endpoint: 'http://agent.test/a2a', profiles: [profile] }];
    },
  });
  for (let i = 0; i < 20; i++) {
    const sub = real.submit(LOCAL_DEMO_PRINCIPAL, `card-${i}`, { text: `Metin ${i}`, skills: ['language'] });
    assert.equal(sub.kind, 'accepted');
    await finished(real, sub.job.id);
  }
  const jobSnap = telemetry.metricsSnapshot();
  const jobCounters = jobSnap.counters.filter(c => c.name === 'personal_jobs_total');
  const stepCounters = jobSnap.counters.filter(c => c.name === 'personal_steps_total');
  assert.equal(jobCounters.length, 1, '20 farklı jobId yeni seri üretmemeli');
  assert.equal(jobCounters[0].value, 20);
  assert.equal(stepCounters.length, 1, '20 farklı agentId yeni seri üretmemeli');
  assert.equal(stepCounters[0].value, 20);

  // Bilinmeyen skill/outcome/errorCode ve yasak etiket anahtarları
  const bounded = new JsonLineTelemetry({ write() {} });
  for (let i = 0; i < 50; i++) {
    bounded.metric({
      name: 'personal_steps_total',
      kind: 'counter',
      value: 1,
      labels: {
        skill: `unknown-skill-${i}`,
        outcome: `weird-outcome-${i}`,
        errorCode: `custom-err-${i}`,
        jobId: `job-${i}`,
        agentId: `agent-${i}`,
        traceId: `trace-${i}`,
        ownerId: `owner-${i}`,
      },
    });
  }
  const snap = bounded.metricsSnapshot();
  assert.equal(snap.counters.length, 1, '50 farklı bilinmeyen etiket tek other serisine düşmeli');
  assert.deepEqual(snap.counters[0].labels, { skill: 'other', outcome: 'other', errorCode: 'other' });
  assert.equal(snap.counters[0].value, 50);

  // Savunmacı kopya: snapshot mutasyonu iç durumu bozmamalı
  snap.counters[0].value = 9999;
  snap.counters[0].labels.skill = 'mutated';
  assert.equal(bounded.metricsSnapshot().counters[0].value, 50);
  assert.equal(bounded.metricsSnapshot().counters[0].labels.skill, 'other');
});

test('H02 hata dayanıklılığı: telemetri write/serialize/port hatası iş akışını bozmaz', async () => {
  // 1) JsonLineTelemetry içinde write hatası
  const brokenWrite = new JsonLineTelemetry({ write() { throw new Error('stdout_closed'); } });
  const h1 = createHarness({ telemetry: brokenWrite });
  const s1 = h1.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-broken-write', { text: 'Merhaba', skills: ['language'] });
  assert.equal(s1.kind, 'accepted');
  const j1 = await finished(h1.real, s1.job.id);
  assert.equal(j1.status, 'completed');
  // Yazım patlasa bile bellek içi metrikler çalışmaya devam eder.
  assert.equal(findMetric(brokenWrite.metricsSnapshot().counters, 'personal_jobs_total', { outcome: 'completed' }).value, 1);

  // 2) Doğrudan event() ve metric() hata atan bozuk Telemetry portu
  const throwingTelemetry = {
    event() { throw new Error('telemetry_event_boom'); },
    metric() { throw new Error('telemetry_metric_boom'); },
  };
  const h2 = createHarness({ telemetry: throwingTelemetry });
  const s2 = h2.real.submit(LOCAL_DEMO_PRINCIPAL, 'k-broken-port', { text: 'Merhaba', skills: ['language', 'keywords'] });
  assert.equal(s2.kind, 'accepted');
  const j2 = await finished(h2.real, s2.job.id);
  assert.equal(j2.status, 'completed');
  assert.equal(h2.repository.state.jobs[0][1].status, 'completed');
});
