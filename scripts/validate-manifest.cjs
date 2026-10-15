const { readFileSync, realpathSync, statSync } = require('node:fs');
const { resolve, relative, isAbsolute, extname, sep } = require('node:path');
const { validateManifest, capabilityDigest } = require('../dist/services/capabilities/manifest.js');
try {
  const inputPath = process.argv[2];
  const skillIds = process.argv.slice(3);
  if (!inputPath || !skillIds.length) throw new Error('Kullanım: npm run validate:manifest -- manifest.json skill-id [skill-id...]');
  // Gerçek yolu çözmek, sembolik bağlantıyla proje dışına çıkılmasını da engeller.
  const projectRoot = realpathSync(resolve(__dirname, '..'));
  const manifestPath = realpathSync(resolve(process.cwd(), inputPath));
  const localPath = relative(projectRoot, manifestPath);
  if (!localPath || isAbsolute(localPath) || localPath === '..' || localPath.startsWith(`..${sep}`) || extname(localPath) !== '.json') {
    throw new Error('Manifest proje dizini içindeki bir JSON dosyası olmalı');
  }
  const stat = statSync(manifestPath);
  if (!stat.isFile() || stat.size > 131072) throw new Error('Manifest en fazla 128 KiB büyüklüğünde normal bir dosya olmalı');
  const raw = readFileSync(manifestPath);
  if (raw.length > 131072) throw new Error('Manifest 128 KiB sınırını aşıyor');
  const manifest = validateManifest(JSON.parse(raw.toString('utf8')), skillIds);
  console.log(JSON.stringify({ valid: true, capabilities: manifest.capabilities.map(cap => ({ id: cap.id, version: cap.version, digest: capabilityDigest(cap) })) }, null, 2));
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}
