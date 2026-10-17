const { readFileSync, writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { platform, release, cpus, totalmem } = require('node:os');
const { OllamaBackend } = require('../dist/services/model/ollama.js');
const { ModelQueue } = require('../dist/services/model/queue.js');
const { FixtureBackend } = require('../dist/services/model/port.js');
async function main() {
  const [model, digest, output] = process.argv.slice(2);
  if (!model || !digest || !output) throw Error('Usage: node scripts/qualify-model.cjs model digest output.json (fixture fixture-v1 for fixture)');
  const raw = readFileSync('tests/fixtures/model/development.json');
  const cases = JSON.parse(raw); const fixture = model === 'fixture';
  const backend = fixture ? new FixtureBackend() : new OllamaBackend({ origin: 'http://127.0.0.1:11434', model, digest, context: 2048, maxTokens: 512, seed: 42 });
  const queue = new ModelQueue(backend); const results = []; const startedAt = new Date().toISOString();
  for (const item of cases) {
    try {
      const reply = await queue.submit({ prompt: item.prompt });
      let parsed; try { parsed = JSON.parse(reply.text); } catch { /* Geçersiz JSON da paydada kalır. */ }
      results.push({ id: item.id, correct: !fixture && JSON.stringify(parsed) === JSON.stringify(item.expected), ...reply, gatewayRssBytes: process.memoryUsage().rss });
      console.log(JSON.stringify({ model, id: item.id, correct: results.at(-1).correct, totalMs: reply.timing.totalMs }));
    } catch (e) { results.push({ id: item.id, correct: false, error: e.code ?? 'failed' }); }
  }
  writeFileSync(output, JSON.stringify({ protocol: 'B08-development-readiness-v1', startedAt, finishedAt: new Date().toISOString(),
    holdoutUsed: false, fixture, qualityBenchmark: false, datasetSha256: createHash('sha256').update(raw).digest('hex'),
    environment: { platform: platform(), release: release(), cpu: cpus()[0].model, cpuCount: cpus().length, hostRamBytes: totalmem(), node: process.version },
    config: { model, digest, context: 2048, maxTokens: 512, seed: 42, temperature: 0, concurrency: 1, timeoutMs: 90000 }, results }, null, 2) + '\n', { flag: 'wx' });
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
