// Medicare cost report pre-audit pages: copy rules, honest positioning, cited claims, real examples.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { apiBySlug } from '../../src/catalog.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const FILES = ['src/pages/HcrisApi.jsx', 'src/pages/DocsHcris.jsx', 'src/site/HcrisDemo.jsx', 'src/site/ReportSheet.jsx',
  'src/content/examples/hcris-demo-fail.json', 'src/content/examples/hcris-paid-pass.json',
  'src/content/examples/hcris-input-error.json', 'pylib/spreadrun_api/validators/hcris/engine.py',
  'pylib/tests/hcris_build.py', 'scripts/hcris/make_samples.py'];

test('no em dashes, en dashes or minus signs in any cost report page, example, engine message or sample builder', () => {
  for (const f of FILES) assert.ok(!/[–—−]/.test(read(f)), f);
});

test('every surface says a PASS is not MAC acceptance and does not determine allowability or payment', () => {
  const line = /PASS is not MAC acceptance and does not determine allowability or payment/;
  assert.match(read('src/pages/HcrisApi.jsx'), line);
  assert.match(read('src/pages/DocsHcris.jsx'), line);
  assert.match(read('src/site/ReportSheet.jsx'), /It is not MAC acceptance and does not determine allowability or payment/);
  const r = JSON.parse(read('src/content/examples/hcris-paid-pass.json')).body.report;
  assert.match(r.scope, line);
});

test('the price is $200 and a paid run is charged exactly that', () => {
  assert.equal(apiBySlug('hcris-preaudit-qa').priceCents, 20000);
  const pass = JSON.parse(read('src/content/examples/hcris-paid-pass.json'));
  assert.equal(pass.body.priceCents, 20000);
  assert.equal(pass.body.charged, true);
  assert.equal(pass.body.report.status, 'PASS');
});

test('the examples are the real engine output on the published samples', () => {
  const fail = JSON.parse(read('src/content/examples/hcris-demo-fail.json')).body.report;
  assert.equal(fail.status, 'FAIL');
  assert.deepEqual(fail.findings.map((f) => f.ruleId).sort(),
    ['BD-120-DAYS', 'BD-BILL-120', 'BD-CAP', 'LIST-MISSING', 'S10-LINE', 'TBD-DUPLICATE', 'TIE-A-B']);
  const s10 = fail.findings.find((f) => f.ruleId === 'S10-LINE');
  assert.equal(s10.worksheet, 'S-10, Part I');
  assert.equal(s10.line, '30');
  assert.equal(s10.actual - s10.expected, 12000);
  assert.equal(fail.findings.find((f) => f.ruleId === 'LIST-MISSING').source, '413.24(f)(5)');
  assert.match(fail.checkedAgainst.transmittal, /Transmittal 26/);
  const err = JSON.parse(read('src/content/examples/hcris-input-error.json'));
  assert.equal(err.status, 400);
  assert.equal(err.body.error.charged, false);
});

test('the claims on the product page cite primary sources, and unverified ones stay off', () => {
  const page = read('src/pages/HcrisApi.jsx');
  assert.ok(page.includes('${ECFR}413.24') && page.includes('${ECFR}413.89'));
  assert.match(page, /cms\.gov\/medicare\/regulations-guidance\/transmittals\/2026-transmittals\/r26p240i/);
  assert.match(page, /electronic-cost-report-exhibit-templates/);
  const body = page.replace(/Left out for lack of a primary[\s\S]*?"thousands" only\./, '');
  assert.ok(!/A-07-20-02825|3,993,946|37\.1|HFMA|PPS Assistant|\$5,000|6,000|25x/.test(body));
  assert.match(page, /Thousands of hospitals file a Medicare cost report every year/);
});

test('the example reports carry no dates, no real hospital, and only pseudonymous row IDs', () => {
  for (const f of ['src/content/examples/hcris-demo-fail.json', 'src/content/examples/hcris-paid-pass.json']) {
    const t = read(f);
    assert.ok(!/EAST CARROLL|LAKE PROVIDENCE|190208/.test(t), f);
    assert.ok(!/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(t), f);
    assert.ok(!/"due"|"asOf"/.test(t), f);
  }
  const dup = JSON.parse(read('src/content/examples/hcris-demo-fail.json')).body.report.findings.find((x) => x.ruleId === 'TBD-DUPLICATE');
  assert.equal(dup.actual, 'account B0000005');
});

test('the page walks through preparing a PHI-free file before the upload', () => {
  const page = read('src/pages/HcrisApi.jsx');
  const guide = page.indexOf('Prepare your file');
  assert.ok(guide > 0 && guide < page.indexOf('<HcrisDemo'));
  for (const s of ['Replace the identifiers', 'Shift the dates', 'Shift the period', 'probably not shifted by the same number of days'])
    assert.ok(page.includes(s), s);
  const demo = read('src/site/HcrisDemo.jsx');
  assert.match(demo, /Do not upload patient names, MBIs, Medicaid numbers or real account numbers\. This tool does not accept PHI, and files containing PHI patterns are refused without charge\./);
  assert.match(demo, /Period start, shifted/);
  assert.match(read('src/Privacy.jsx'), /For the Medicare Cost Report Pre-Audit QA, SpreadRun requires de-identified listings/);
});

test('a $250 pack covers exactly 1.25 runs at $200', async () => {
  const { runsPer } = await import('../../src/catalog.js');
  assert.equal(runsPer(25000, 20000), '1.25');
});
