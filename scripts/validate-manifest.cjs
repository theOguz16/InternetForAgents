const { readFileSync } = require('node:fs');
const { validateManifest, capabilityDigest } = require('../dist/services/capabilities/manifest.js');
try {
  const path = process.argv[2];
  const skillIds = process.argv.slice(3);
  if (!path || !skillIds.length) throw new Error('Kullanım: npm run validate:manifest -- manifest.json skill-id [skill-id...]');
  const raw = readFileSync(path);
  if (raw.length > 131072) throw new Error('Manifest 128 KiB sınırını aşıyor');
  const manifest = validateManifest(JSON.parse(raw.toString('utf8')), skillIds);
  console.log(JSON.stringify({ valid: true, capabilities: manifest.capabilities.map(cap => ({ id: cap.id, version: cap.version, digest: capabilityDigest(cap) })) }, null, 2));
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}
