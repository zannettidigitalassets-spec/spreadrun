// SCA H&W checker pages: copy rules, honest positioning, and one source for the rate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const FILES = ['src/pages/ScaApi.jsx', 'src/pages/DocsSca.jsx', 'src/site/ScaDemo.jsx', 'src/site/ReportSheet.jsx',
  'public/samples/sca-errors.json', 'public/samples/sca-clean.json', 'public/samples/sca-template.csv',
  'src/content/examples/sca-demo-fail.json', 'src/content/examples/sca-paid-pass.json', 'src/content/examples/sca-input-error.json',
  'pylib/spreadrun_api/validators/sca/engine.py', 'pylib/spreadrun_api/validators/sca/rates.json'];

test('no em dashes, en dashes or minus signs in any SCA page, sample, example or engine message', () => {
  for (const f of FILES) assert.ok(!/[–—−]/.test(read(f)), f);
});

test('every surface says a PASS is a math check, not a compliance determination', () => {
  const page = read('src/pages/ScaApi.jsx');
  assert.match(page, /not a compliance determination/);
  assert.match(page, /not DOL acceptance/);
  assert.match(page, /obligations under the contract remain yours/);
  assert.match(read('src/pages/DocsSca.jsx'), /not a compliance determination and not DOL acceptance/);
  assert.match(read('src/site/ReportSheet.jsx'), /not a compliance determination and not DOL acceptance/);
  const report = JSON.parse(read('src/content/examples/sca-paid-pass.json')).body.report;
  assert.match(report.scope, /not a compliance determination, not legal advice and not DOL acceptance/);
});

test('the rate lives in rates.json only: no page hardcodes it', () => {
  const rates = JSON.parse(read('pylib/spreadrun_api/validators/sca/rates.json')).rates;
  for (const f of ['src/pages/ScaApi.jsx', 'src/pages/DocsSca.jsx', 'src/site/ScaDemo.jsx']) {
    const src = read(f);
    for (const r of Object.values(rates)) assert.ok(!src.includes(r), `${f} hardcodes ${r}`);
    assert.ok(!/5\.55|5\.09|2\.42/.test(src), `${f} has a superseded 2025 rate`);
  }
});

test('the sample report and paid example are the real engine output', () => {
  const fail = JSON.parse(read('src/content/examples/sca-demo-fail.json'));
  assert.equal(fail.status, 200);
  assert.equal(fail.body.charged, false);
  assert.equal(fail.body.report.status, 'FAIL');
  assert.deepEqual(fail.body.report.shortfallLines, [4, 5, 6]);
  const pass = JSON.parse(read('src/content/examples/sca-paid-pass.json'));
  assert.equal(pass.body.priceCents, 10000);
  assert.equal(pass.body.report.status, 'PASS');
  const err = JSON.parse(read('src/content/examples/sca-input-error.json'));
  assert.equal(err.status, 400);
  assert.equal(err.body.error.charged, false);
  assert.match(err.body.error.message, /All Agency Memorandum 246/);
});

test('reports never carry employee references; the page joins them in the browser', () => {
  const sample = JSON.parse(read('public/samples/sca-errors.json'));
  const report = read('src/content/examples/sca-demo-fail.json');
  for (const ref of sample.employeesCsv.match(/E-\d+/g)) assert.ok(!report.includes(ref), ref);
  assert.match(read('src/site/ScaDemo.jsx'), /readRefs/);
});

test('the claims on the product page cite their sources', () => {
  const page = read('src/pages/ScaApi.jsx');
  assert.match(page, /gao\.gov\/products\/GAO-21-11/);
  assert.match(page, /fact-sheets\/67b-meeting-requirements-sca/);
  assert.match(page, /fact-sheets\/67-sca/);
  assert.match(page, /AAM246\.pdf/);
  for (const s of ['4.170', '4.171', '4.172', '4.175', '4.176', '4.177']) assert.ok(page.includes(`\`\${ECFR}${s}\``), s);
  assert.ok(!/42,6\d\d|D2 Government|5,261/.test(page), 'unsourced or off-scope figures stay off the page');
});
