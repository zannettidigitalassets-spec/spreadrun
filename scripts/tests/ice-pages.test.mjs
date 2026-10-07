// ICE adequacy pre-check pages: copy rules, honest positioning, cited claims, real examples.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { apiBySlug } from '../../src/catalog.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const FILES = ['src/pages/IceApi.jsx', 'src/pages/DocsIce.jsx', 'src/site/IceDemo.jsx', 'src/site/ReportSheet.jsx',
  'src/content/examples/ice-demo-fail.json', 'src/content/examples/ice-paid-pass.json', 'src/content/examples/ice-input-error.json',
  'pylib/spreadrun_api/validators/ice/engine.py', 'pylib/tests/ice_build.py', 'scripts/ice/make_samples.py'];

test('no em dashes, en dashes or minus signs in any ICE page, example, engine message or sample builder', () => {
  for (const f of FILES) assert.ok(!/[–—−]/.test(read(f)), f);
});

test('every surface says adequacy is not allowability and a PASS is not DCAA acceptance', () => {
  const page = read('src/pages/IceApi.jsx');
  assert.match(page, /Adequacy, not allowability/);
  assert.match(page, /a PASS is not DCAA acceptance/);
  assert.match(page, /FAR Part 31/);
  assert.match(read('src/pages/DocsIce.jsx'), /does not judge allowability/);
  assert.match(read('src/site/ReportSheet.jsx'), /Adequacy is not allowability, and a PASS is not DCAA acceptance/);
  const r = JSON.parse(read('src/content/examples/ice-paid-pass.json')).body.report;
  assert.match(r.scope, /Adequacy is not allowability, and a PASS is not DCAA acceptance/);
});

test('the price is $250 and a paid run is charged exactly that', () => {
  assert.equal(apiBySlug('ice-adequacy-precheck').priceCents, 25000);
  const pass = JSON.parse(read('src/content/examples/ice-paid-pass.json'));
  assert.equal(pass.body.priceCents, 25000);
  assert.equal(pass.body.report.status, 'PASS');
});

test('the examples are the real engine output on the published samples', () => {
  const fail = JSON.parse(read('src/content/examples/ice-demo-fail.json')).body.report;
  assert.equal(fail.status, 'FAIL');
  assert.deepEqual(fail.findings.map((f) => `${f.ruleId} ${f.tab}`).sort(),
    ['ICE-CERT-UNSIGNED N', 'ICE-FOOT G', 'ICE-FOOT G', 'ICE-NOTES C', 'ICE-TIE A', 'ICE-TIE B']);
  for (const f of fail.findings.filter((x) => x.ruleId === 'ICE-FOOT' || x.ruleId === 'ICE-TIE')) {
    assert.ok(f.tab && f.range && typeof f.expected === 'number' && typeof f.actual === 'number');
  }
  assert.equal(fail.checklist.length, 47);
  const err = JSON.parse(read('src/content/examples/ice-input-error.json'));
  assert.equal(err.status, 400);
  assert.match(err.body.error.message, /\.xls file/);
  assert.equal(err.body.error.charged, false);
});

test('the claims on the product page cite primary sources, and unsourced ones stay off', () => {
  const page = read('src/pages/IceApi.jsx');
  for (const s of ['52.216-7', '42.703-2', '52.242-4', '42.705-1']) assert.ok(page.includes(`\${ECFR}${s}`), s);
  assert.match(page, /dcaa\.mil\/Portals\/88\/Documents\/Checklists/);
  assert.match(page, /gao\.gov\/products\/GAO-13-131/);
  assert.ok(!/16\.2|\$5 million|50,000|wifcon|12x/i.test(page.replace(/Left out for lack of a primary[\s\S]*?reviews\./, '')));
});

test('no rate, address or company name from DCAA\'s demo leaks into the site', () => {
  for (const f of ['src/pages/IceApi.jsx', 'src/pages/DocsIce.jsx', 'src/content/examples/ice-demo-fail.json']) {
    assert.ok(!/Kingman|Fort Belvoir|ICE Demo Company/.test(read(f)), f);
  }
});
