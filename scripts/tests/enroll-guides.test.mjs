// PECOS and COBRA guide batch 3: metadata rules the site depends on. The rendered pages are checked by check-site.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENROLL_GUIDES, SRC, ENROLL_GUIDE_PUBLISHED } from '../../src/content/enroll-guides.js';
import { DEADLINE_GUIDES } from '../../src/content/deadline-guides.js';
import { WH347_GUIDES } from '../../src/content/wh347-guides.js';
import { APIS } from '../../src/catalog.js';

const DASH = /[–—−]/;
const SLUGS = ['pecos-returned-for-corrections', 'npi-not-active-nppes', '855i-rejection-reasons',
  'cobra-election-notice-requirements', 'cobra-notice-deadlines'];
const BODY = fs.readFileSync(new URL('../../src/pages/EnrollGuides.jsx', import.meta.url), 'utf8');
const COPY = BODY.replace(/\/\/.*$/gm, '');

test('the five pages, in the brief order, with no slug clash', () => {
  assert.deepEqual(ENROLL_GUIDES.map((g) => g.slug), SLUGS);
  assert.equal(ENROLL_GUIDE_PUBLISHED, '2026-10-05');
  const earlier = new Set([...DEADLINE_GUIDES, ...WH347_GUIDES].map((g) => g.slug));
  for (const s of SLUGS) assert.ok(!earlier.has(s), s);
});

test('titles, descriptions and blurbs follow the copy rules', () => {
  for (const g of ENROLL_GUIDES) {
    assert.ok(g.description.length >= 150 && g.description.length <= 160, `${g.slug}: description ${g.description.length} chars`);
    for (const t of [g.title, g.description, g.blurb, g.crumb]) {
      assert.ok(!DASH.test(t), `${g.slug}: dash in copy`);
      assert.ok(!/SecondRing/i.test(t), `${g.slug}: SecondRing`);
    }
    assert.ok(!/\| SpreadRun/.test(g.title), `${g.slug}: the route adds the brand suffix`);
  }
});

test('primary sources only, and the right CTA per family', () => {
  const live = new Set(APIS.map((a) => `/apis/${a.slug}`));
  for (const g of ENROLL_GUIDES) {
    assert.ok(g.sources.length >= 2, `${g.slug}: at least two sources`);
    for (const k of g.sources) assert.ok(SRC[k], `${g.slug}: unknown source ${k}`);
    for (const href of g.cta) assert.ok(live.has(href), `${g.slug}: CTA ${href} is not a live page`);
    assert.deepEqual(g.cta, [g.family === 'pecos' ? '/apis/pecos-enrollment-precheck' : '/apis/cobra-notice-qa'], g.slug);
  }
  for (const [label, url] of Object.values(SRC)) {
    assert.match(url, /^https:\/\/(www\.ecfr\.gov|www\.cms\.gov|npiregistry\.cms\.hhs\.gov)\//, label);
  }
});

test('no ranking by frequency', () => {
  assert.ok(!/most (common|often|frequent)|top reasons?|\b(usually|typically|rarely)\b/i.test(COPY));
  assert.match(COPY, /CMS does not publish how often each one happens/);
});

test('all fourteen election notice items and six general notice items are on the page', () => {
  for (const n of ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv']) {
    assert.ok(COPY.includes(`['${n}', '`), `item (${n})`);
  }
  for (const n of ['1', '2', '3', '4', '5', '6']) assert.ok(COPY.includes(`['${n}', '`), `general item ${n}`);
});

test('the worked COBRA timeline adds up', () => {
  const add = (iso, d) => { const x = new Date(`${iso}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  assert.equal(add('2026-09-30', 44), '2026-11-13');
  assert.equal(add('2026-10-09', 60), '2026-12-08');
  assert.equal(add('2026-11-20', 45), '2027-01-04');
  for (const d of ['November 13, 2026', 'October 9, 2026', 'December 8, 2026', 'November 20, 2026', 'January 4, 2027']) {
    assert.ok(COPY.includes(d), d);
  }
});

test('seven 855I reasons, each with a fix', () => {
  const section = COPY.slice(COPY.indexOf('function Rejections'), COPY.indexOf('// ----', COPY.indexOf('function Rejections')));
  assert.equal((section.match(/<h2>\d\. /g) || []).length, 7);
  assert.equal((section.match(/<b>Fix:<\/b>/g) || []).length, 7);
});

test('page source has no dashes and no bare "verified"', () => {
  assert.ok(!DASH.test(BODY));
  assert.ok(!/\bverified\b/i.test(COPY));
});
