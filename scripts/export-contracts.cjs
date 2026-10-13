const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { schemas } = require('../dist/services/shared/contracts.js');
// Yayınlanan JSON dosyalarını çalışma anındaki şemalardan üretir; iki ayrı tanım tutmayız.
const directory = join(__dirname, '..', 'contracts', 'text');
mkdirSync(directory, { recursive: true });
for (const [profile, definitions] of Object.entries(schemas)) {
  for (const [kind, schema] of Object.entries(definitions)) {
    writeFileSync(join(directory, `${profile}.${kind}.schema.json`), JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#', ...schema,
    }, null, 2) + '\n');
  }
}
