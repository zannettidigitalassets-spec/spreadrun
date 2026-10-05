// WH-347 guide batch 2: metadata rules the site depends on. The rendered pages are checked by check-site.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WH347_GUIDES, SRC, WH347_GUIDE_PUBLISHED } from '../../src/content/wh347-guides.js';
import { DEADLINE_GUIDES } from '../../src/content/deadline-guides.js';
import { APIS } from '../../src/catalog.js';

const DASH = /[–—−]/;
const SLUGS = ['wh347-apprentice-reporting', 'wh347-statement-of-compliance', 'wh347-common-mistakes',
  'davis-bacon-fringe-annualization', 'davis-bacon-weighted-overtime'];
const BODY = fs.readFileSync(new URL('../../src/pages/Wh347Guides.jsx', import.meta.url), 'utf8');

test('the five pages, in the brief order, with no slug clash', () => {
  assert.deepEqual(WH347_GUIDES.map((g) => g.slug), SLUGS);
  assert.equal(WH347_GUIDE_PUBLISHED, '2026-10-05');
  const batch1 = new Set(DEADLINE_GUIDES.map((g) => g.slug));
  for (const s of SLUGS) assert.ok(!batch1.has(s), s);
});

test('titles, descriptions and blurbs follow the copy rules', () => {
  for (const g of WH347_GUIDES) {
    assert.ok(g.description.length >= 150 && g.description.length <= 160, `${g.slug}: description ${g.description.length} chars`);
    for (const t of [g.title, g.description, g.blurb, g.crumb]) {
      assert.ok(!DASH.test(t), `${g.slug}: dash in copy`);
      assert.ok(!/SecondRing/i.test(t), `${g.slug}: SecondRing`);
    }
    assert.ok(!/\| SpreadRun/.test(g.title), `${g.slug}: the route adds the brand suffix`);
  }
});

test('every page cites known primary sources and links a live CTA', () => {
  const live = new Set([...APIS.map((a) => `/apis/${a.slug}`), '/tools/davis-bacon-apprentice-checker',
    '/tools/davis-bacon-fringe-calculator', '/tools/davis-bacon-overtime-calculator']);
  for (const g of WH347_GUIDES) {
    assert.ok(g.sources.length >= 2, `${g.slug}: at least two sources`);
    for (const k of g.sources) assert.ok(SRC[k], `${g.slug}: unknown source ${k}`);
    for (const href of g.cta) assert.ok(live.has(href), `${g.slug}: CTA ${href} is not a live page`);
  }
  for (const [label, url] of Object.values(SRC)) {
    assert.match(url, /^https:\/\/(www\.dol\.gov|www\.ecfr\.gov|www\.law\.cornell\.edu|www\.reginfo\.gov|www\.federalregister\.gov)\//, label);
  }
});

test('CTAs per the brief', () => {
  const cta = Object.fromEntries(WH347_GUIDES.map((g) => [g.slug, g.cta]));
  assert.deepEqual(cta['wh347-apprentice-reporting'], ['/tools/davis-bacon-apprentice-checker', '/apis/wh347-payroll-precheck']);
  assert.deepEqual(cta['wh347-statement-of-compliance'], ['/apis/wh347-payroll-precheck']);
  assert.deepEqual(cta['wh347-common-mistakes'], ['/apis/wh347-payroll-precheck']);
  assert.deepEqual(cta['davis-bacon-fringe-annualization'], ['/tools/davis-bacon-fringe-calculator']);
  assert.deepEqual(cta['davis-bacon-weighted-overtime'], ['/tools/davis-bacon-overtime-calculator']);
});

test('no claim that agencies reject old WH-347 forms from a date', () => {
  const copy = BODY.replace(/\/\/.*$/gm, '');
  assert.ok(!/September 30, 2026/.test(copy), 'unverified prior OMB expiration date');
  for (const m of copy.matchAll(/reject\w*/gi)) {
    const around = copy.slice(Math.max(0, m.index - 200), m.index + 200);
    assert.ok(!/(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/.test(around), 'a date next to "reject"');
  }
});

test('worked examples add up', () => {
  // Fringe: $10,400 over 2,000 hours, $9.00 required, 1,200 Davis-Bacon hours.
  assert.equal((10400 / 2000).toFixed(2), '5.20');
  assert.equal((9 - 5.2).toFixed(2), '3.80');
  assert.equal((3.8 * 1200).toFixed(2), '4560.00');
  assert.equal((10400 / 1200).toFixed(2), '8.67');
  assert.equal(Math.round((10400 / 1200 - 5.2) * 1200), 4160);
  assert.equal((18000 / 2000).toFixed(2), '9.00');
  // Overtime: 26 h at $40 and 20 h at $28, 6 hours over 40.
  const st = 26 * 40 + 20 * 28;
  assert.equal(st, 1600);
  assert.equal((st / 46).toFixed(2), '34.78');
  assert.equal((st / 46 * 0.5 * 6).toFixed(2), '104.35');
  assert.equal((34.78 * 0.5 * 6).toFixed(2), '104.34');
  assert.equal((st + st / 46 * 0.5 * 6).toFixed(2), '1704.35');
  assert.equal(6 * 40 * 0.5, 120);
  assert.equal(6 * 28 * 0.5, 84);
  assert.equal(26 * 15 + 20 * 10, 590);
  for (const n of ['$5.20', '$3.80', '$4,560.00', '$8.67', '$4,160', '$9.00', '$1,600.00', '$34.78', '$104.35', '$1,704.35', '$120.00', '$84.00', '$590.00']) {
    assert.ok(BODY.includes(n), `${n} on the page`);
  }
});

test('page source has no dashes and no bare "verified"', () => {
  assert.ok(!DASH.test(BODY));
  assert.ok(!/\bverified\b/i.test(BODY.replace(/\/\/.*$/gm, '')));
});
