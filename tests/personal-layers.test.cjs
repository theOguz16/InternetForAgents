const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { JobService } = require('../dist/services/personal/application/job-service.js');
const { DiscoveryError } = require('../dist/services/personal/application/ports.js');
const { selectProvider } = require('../dist/services/personal/domain/provider-selection.js');
const { LOCAL_DEMO_PRINCIPAL } = require('../dist/services/identity/domain/principal.js');

const root = join(__dirname, '..', 'services', 'personal');
const sources = dir => readdirSync(join(root, dir)).filter(name => name.endsWith('.ts')).map(name => ({ name: `${dir}/${name}`, text: readFileSync(join(root, dir, name), 'utf8') }));
// Statik ve dinamik importları, tür importu olup olmadığıyla birlikte çıkarır.
function imports(text) {
  return [...text.matchAll(/^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/gm)]
    .map(m => ({ specifier: m[3] ?? m[4] ?? m[5], typeOnly: Boolean(m[2]) }));
}
const frameworks = /^(express|node:sqlite|@a2a-js\/|ajv)/;
function violations(layer, files) {
  const found = [];
  for (const { name, text } of files) for (const { specifier, typeOnly } of imports(text)) {
    if (layer === 'domain' && !typeOnly) found.push(`${name}: çalışma anı importu ${specifier}`);
    if (layer !== 'presentation' && frameworks.test(specifier)) found.push(`${name}: ${specifier}`);
    if (layer !== 'infrastructure' && specifier.includes('/infrastructure/')) found.push(`${name}: altyapıya bağımlı ${specifier}`);
    if (layer === 'presentation' && /^(node:sqlite|@a2a-js\/)/.test(specifier)) found.push(`${name}: ${specifier}`);
  }
  return found;
}

test('D01: domain Express/SQLite/SDK/Ajv import etmez; application altyapıya bağlı değil', () => {
  assert.deepEqual(violations('domain', sources('domain')), []);
  assert.deepEqual(violations('application', sources('application')), []);
  assert.deepEqual(violations('presentation', [{ name: 'router.ts', text: readFileSync(join(root, 'router.ts'), 'utf8') }]), []);
  // Denetleyicinin kendisi ihlali yakalamalı; aksi halde boş sonuç bir şey kanıtlamaz.
  assert.equal(violations('domain', [{ name: 'x.ts', text: "import { Router } from \"express\";\nimport type { A } from './a.js';" }]).length, 2);
  assert.equal(violations('application', [{ name: 'x.ts', text: "import { DatabaseSync } from 'node:sqlite';\nimport { PersonalStore } from '../infrastructure/sqlite-job-store.js';" }]).length, 2);
  assert.equal(violations('application', [{ name: 'x.ts', text: "const sdk = await import('@a2a-js/sdk');" }]).length, 1);
});

function memoryRepository(initial = { jobs: [], keys: [] }) {
  let state = structuredClone(initial);
  return { saves: 0, load: () => structuredClone(state), save(next) { this.saves++; state = structuredClone(next); }, get state() { return state; } };
}
const endpoint = 'http://agent.test/a2a';
const candidate = (id, profiles) => ({ id, name: id, endpoint, profiles });
function fakes({ candidates = profile => [candidate(`a-${profile}`, [profile])], connect, execute } = {}) {
  const calls = { connect: 0, execute: 0 };
  return {
    calls,
    directory: { async find(profile) { if (typeof candidates === 'function') return candidates(profile); throw candidates; } },
    gateway: {
      async connect(provider, profile) {
        calls.connect++; if (connect) await connect(provider, profile);
        return { async execute(text, hooks) {
          calls.execute++; hooks.taskIdentified(`remote-${profile}`); hooks.progressed();
          return execute ? execute(profile, text) : { terminal: 'completed', result: { profile, mode: 'deterministic', output: {} } };
        } };
      },
    },
  };
}
function service(overrides = {}) {
  const f = fakes(overrides);
  let now = overrides.now ?? new Date('2026-11-19T10:00:00Z'); let id = 0;
  const repository = overrides.repository ?? memoryRepository();
  const real = new JobService({ repository, clock: { now: () => now }, newId: () => `job-${++id}`, directory: f.directory, gateway: f.gateway, allowedOrigins: new Set(['http://agent.test']) });
  // D01 testleri tek çağıranla çalışır; sahiplik E01 testlerinde ayrıca denetlenir.
  const as = overrides.principal ?? LOCAL_DEMO_PRINCIPAL;
  const jobs = { submit: (key, value) => real.submit(as, key, value), get: id => real.get(as, id), subscribe: (id, fn) => real.subscribe(id, fn) };
  return { jobs, real, repository, calls: f.calls, advance: ms => { now = new Date(now.getTime() + ms); } };
}
const finished = (jobs, id) => new Promise(resolve => {
  const off = jobs.subscribe(id, job => { if (job.status !== 'running') { off(); resolve(job); } });
});
const body = { text: 'Merhaba dünya', skills: ['language', 'keywords'] };

test('D01 JobService: kabul snapshot revision 0; tamamlanınca kalıcı ve birleşik durum', async () => {
  const { jobs, repository } = service();
  const outcome = jobs.submit('k1', body);
  assert.equal(outcome.kind, 'accepted');
  assert.equal(outcome.job.revision, 0);
  assert.deepEqual(outcome.job.children.map(c => c.state), ['discovering', 'discovering']);
  const job = await finished(jobs, outcome.job.id);
  assert.equal(job.status, 'completed');
  assert.deepEqual(job.children.map(c => c.remoteTaskId), ['remote-text-keywords.v1', 'remote-text-language.v1']);
  assert.equal(repository.state.jobs[0][1].status, 'completed');
  assert.equal(repository.state.jobs[0][1].revision, job.revision);
  assert.equal(jobs.submit('k1', body).kind, 'existing');
  assert.deepEqual(jobs.submit('k1', { ...body, text: 'farklı' }), { kind: 'error', code: 'idempotency_conflict' });
});

test('D01 JobService: gönderim öncesi hata failed, sonrası unknown; yeniden gönderim yok', async () => {
  let s = service({ candidates: () => [] });
  let job = await finished(s.jobs, s.jobs.submit('k', body).job.id);
  assert.equal(job.status, 'failed'); assert.deepEqual(job.children.map(c => c.error), ['no_provider', 'no_provider']);

  s = service({ candidates: new DiscoveryError('invalid_registry_response') });
  job = await finished(s.jobs, s.jobs.submit('k', body).job.id);
  assert.deepEqual(job.children.map(c => c.error), ['invalid_registry_response', 'invalid_registry_response']);

  s = service({ connect: () => { throw new Error('card_unreachable'); } });
  job = await finished(s.jobs, s.jobs.submit('k', body).job.id);
  assert.equal(job.status, 'failed'); assert.deepEqual(job.children.map(c => [c.state, c.error]), [['failed', 'discovery_failed'], ['failed', 'discovery_failed']]);
  assert.equal(s.calls.execute, 0);

  s = service({ execute: profile => { if (profile === 'text-language.v1') throw new Error('stream_lost'); return { terminal: 'completed', result: { profile, mode: 'deterministic', output: {} } }; } });
  job = await finished(s.jobs, s.jobs.submit('k', body).job.id);
  assert.equal(job.status, 'partial');
  const language = job.children.find(c => c.skill === 'language');
  assert.deepEqual([language.state, language.error], ['unknown', 'execution_unknown']);
  assert.equal(s.calls.execute, 2, 'belirsiz görev başka sağlayıcıya tekrar gönderilmemeli');

  s = service({ execute: () => ({ terminal: 'failed' }) });
  job = await finished(s.jobs, s.jobs.submit('k', body).job.id);
  assert.deepEqual(job.children.map(c => c.error), ['provider_failed', 'provider_failed']);
});

test('D01 JobService: saat portu süre sonunu belirler; anahtar işle birlikte silinir', async () => {
  const s = service();
  const first = await finished(s.jobs, s.jobs.submit('old', body).job.id);
  s.advance(86_400_000 - 1);
  assert.equal(s.jobs.submit('other', { ...body, skills: ['summary'] }).kind, 'accepted');
  assert.ok(s.jobs.get(first.id), '24 saatten genç iş korunur');
  s.advance(1);
  const again = s.jobs.submit('old', body);
  assert.equal(again.kind, 'accepted');
  assert.notEqual(again.job.id, first.id);
  assert.equal(s.jobs.get(first.id), undefined);
});

test('D01 JobService: yeniden başlatmada yarım iş unknown, bitmiş iş aynen korunur', () => {
  const done = { id: 'done', status: 'completed', revision: 2, createdAt: '2026-11-19T09:00:00.000Z', children: [{ skill: 'language', state: 'completed' }] };
  const half = { id: 'half', status: 'running', revision: 1, createdAt: done.createdAt, children: [{ skill: 'language', state: 'completed' }, { skill: 'summary', state: 'working' }] };
  const repository = memoryRepository({ jobs: [['done', done], ['half', half]], keys: [] });
  const { jobs, calls } = service({ repository });
  assert.deepEqual(jobs.get('done'), { ...done, ownerId: 'local-demo' });
  const recovered = jobs.get('half');
  assert.equal(recovered.status, 'partial'); assert.equal(recovered.revision, 2);
  assert.deepEqual(recovered.children[1], { skill: 'summary', state: 'unknown', error: 'personal_restarted' });
  assert.equal(repository.state.jobs[1][1].status, 'partial');
  assert.equal(calls.connect, 0, 'yeniden başlatma yeni iş göndermez');
});

test('D01 seçim: bozuk, izinsiz veya kimlik bilgili adresler elenir; sıra deterministik', () => {
  const allowed = new Set(['http://agent.test']);
  const profile = 'text-language.v1';
  assert.equal(selectProvider([
    candidate('z', [profile]), candidate('b', [profile]),
    { id: 'a', name: 'a', endpoint: 'http://evil.test/a2a', profiles: [profile] },
    { id: 'a1', name: 'a1', endpoint: 'http://user:pw@agent.test/a2a', profiles: [profile] },
    { id: 'a2', name: 'a2', endpoint: 'http://agent.test/other', profiles: [profile] },
    { id: 'a3', name: 'a3', endpoint: 'not a url', profiles: [profile] },
    { id: 'a4', name: 'a4', endpoint, profiles: 'not-array' },
    candidate('a5', ['text-summary.v1']),
  ], profile, allowed).id, 'b');
  assert.equal(selectProvider([], profile, allowed), undefined);
});
