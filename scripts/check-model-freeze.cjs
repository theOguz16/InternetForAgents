const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
function checkFreeze(root = resolve(__dirname, '..')) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/evaluation/EVAL-M1.json')));
  const digest = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
  assert.equal(manifest.protocol, 'EVAL-M1'); assert.equal(manifest.status, 'frozen-before-holdout'); assert.equal(manifest.holdoutAccessed, false);
  for (const [path, sha] of Object.entries(manifest.implementation.sourceHashes)) assert.equal(digest(path), sha);
  assert.equal(digest(manifest.qualification.dataset), manifest.qualification.datasetSha256);
  for (const report of manifest.qualification.reports) assert.equal(digest(report.path), report.sha256);
  const selected = manifest.qualification.reports.find(r => r.model === manifest.model.model); assert.ok(selected);
  const report = JSON.parse(readFileSync(resolve(root, selected.path)));
  for (const [key, value] of Object.entries(report.config)) assert.deepEqual(manifest.model[key], value);
  assert.equal(report.holdoutUsed, false); assert.equal(report.fixture, false);
  assert.equal(manifest.model.backendVersion, report.results.find(r => r.model).model.backendVersion);
  assert.equal(report.results.length, selected.total); assert.equal(report.results.filter(r => r.correct).length, selected.correct);
  for (const [key, value] of Object.entries(manifest.qualityAcceptance)) if (key !== 'policy') assert.ok(typeof value === 'number' && value >= 0 && value <= 1);
  return manifest;
}
module.exports = { checkFreeze };
if (require.main === module) { try { console.log(JSON.stringify({ valid: true, model: checkFreeze().model })); } catch { console.error('eval_manifest_mismatch'); process.exitCode = 1; } }
