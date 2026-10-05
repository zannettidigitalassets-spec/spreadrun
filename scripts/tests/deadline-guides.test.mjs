// Deadline guide batch 1: metadata rules the site depends on. The rendered pages are checked by check-site.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEADLINE_GUIDES, SRC, DEADLINE_GUIDE_PUBLISHED } from '../../src/content/deadline-guides.js';
import { APIS } from '../../src/catalog.js';

const DASH = /[–—]/;
const SLUGS = ['pbj-zero-rn-days', 'uad36-rule-uad1189', 'uad36-rule-uad1001', 'pbj-file-rejected', 'how-to-fix-ucdp-errors'];

test('the five pages, in the brief order', () => {
  assert.deepEqual(DEADLINE_GUIDES.map((g) => g.slug), SLUGS);
  assert.equal(DEADLINE_GUIDE_PUBLISHED, '2026-10-05');
});

test('titles, descriptions and blurbs follow the copy rules', () => {
  for (const g of DEADLINE_GUIDES) {
    assert.ok(g.description.length >= 150 && g.description.length <= 160, `${g.slug}: description ${g.description.length} chars`);
    for (const t of [g.title, g.description, g.blurb, g.crumb]) {
      assert.ok(!DASH.test(t), `${g.slug}: dash in copy`);
      assert.ok(!/SecondRing/i.test(t), `${g.slug}: SecondRing`);
    }
    assert.ok(!/\| SpreadRun/.test(g.title), `${g.slug}: the route adds the brand suffix`);
  }
});

test('every page cites known primary sources and links a real CTA', () => {
  const live = new Set([...APIS.map((a) => `/apis/${a.slug}`), '/tools/pbj-preflight-checks']);
  for (const g of DEADLINE_GUIDES) {
    assert.ok(g.sources.length >= 2, `${g.slug}: at least two sources`);
    for (const k of g.sources) assert.ok(SRC[k], `${g.slug}: unknown source ${k}`);
    for (const href of g.cta) assert.ok(live.has(href), `${g.slug}: CTA ${href} is not a live page`);
  }
  for (const [label, url] of Object.values(SRC)) {
    assert.match(url, /^https:\/\/(www\.cms\.gov|qtso\.cms\.gov|singlefamily\.fanniemae\.com|sf\.freddiemac\.com)\//, label);
    assert.ok(!DASH.test(label), label);
  }
});

test('PBJ pages point at the PBJ validator, UAD pages at the UAD validator', () => {
  for (const g of DEADLINE_GUIDES) {
    assert.ok(g.cta.includes(g.family === 'pbj' ? '/apis/pbj-staffing-qa' : '/apis/uad-36-appraisal-validator'), g.slug);
  }
  assert.ok(DEADLINE_GUIDES.find((g) => g.slug === 'pbj-zero-rn-days').cta.includes('/tools/pbj-preflight-checks'));
});

test('page source has no dashes and no bare "verified"', () => {
  const src = fs.readFileSync(new URL('../../src/pages/DeadlineGuides.jsx', import.meta.url), 'utf8');
  assert.ok(!DASH.test(src));
  const copy = src.replace(/\/\/.*$/gm, '');
  assert.ok(!/\bverified\b/i.test(copy));
});
