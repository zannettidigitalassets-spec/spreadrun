// Fails the build if a copied DataForge validator no longer matches its recorded hash.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = new URL('../pylib/spreadrun_api/validators/', import.meta.url);
const prov = JSON.parse(fs.readFileSync(new URL('PROVENANCE.json', dir)));
let bad = 0;
for (const [rel, meta] of Object.entries(prov.files)) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(new URL(rel, dir))).digest('hex');
  if (hash !== meta.sha256) { console.error(`PROVENANCE MISMATCH ${rel}: ${hash} != ${meta.sha256}`); bad++; }
}
if (bad) process.exit(1);
console.log(`provenance ok: ${Object.keys(prov.files).length} files match DataForge ${prov.dataforgeCommit.slice(0, 7)}`);
