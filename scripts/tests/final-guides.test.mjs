// Guide batch 4 (CMMC, COBRA penalties, missed revalidation, CPSC eFiling): metadata and copy rules the site depends on.
// The rendered pages are checked by check-site.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FINAL_GUIDES, SRC, FINAL_GUIDE_PUBLISHED } from '../../src/content/final-guides.js';
import { DEADLINE_GUIDES } from '../../src/content/deadline-guides.js';
import { WH347_GUIDES } from '../../src/content/wh347-guides.js';
import { ENROLL_GUIDES } from '../../src/content/enroll-guides.js';
import { APIS } from '../../src/catalog.js';

const DASH = /[–—−]/;
const SLUGS = ['sprs-score-calculation', 'cmmc-poam-rules', 'cobra-penalty-110-per-day',
  'medicare-revalidation-missed-deadline', 'what-is-cpsc-efiling'];
const BODY = fs.readFileSync(new URL('../../src/pages/FinalGuides.jsx', import.meta.url), 'utf8');
const COPY = BODY.replace(/\/\/.*$/gm, '');
const CLIENT = fs.readFileSync(new URL('../../src/entry-client.jsx', import.meta.url), 'utf8');
const section = (name) => {
  const start = COPY.indexOf(`function ${name}`);
  const next = COPY.indexOf('// ----', start);
  return COPY.slice(start, next === -1 ? COPY.indexOf('const BODIES', start) : next);
};

const CTA = {
  cmmc: '/apis/cmmc-self-assessment-validator',
  cobra: '/apis/cobra-notice-qa',
  pecos: '/apis/pecos-enrollment-precheck',
  cpsc: '/tools/cpsc-efiling-readiness-checklist',
};

test('the five pages, in the brief order, with no slug clash', () => {
  assert.deepEqual(FINAL_GUIDES.map((g) => g.slug), SLUGS);
  assert.equal(FINAL_GUIDE_PUBLISHED, '2026-10-05');
  const earlier = new Set([...DEADLINE_GUIDES, ...WH347_GUIDES, ...ENROLL_GUIDES].map((g) => g.slug));
  for (const s of SLUGS) assert.ok(!earlier.has(s), s);
});

test('titles match the brief, and descriptions and blurbs follow the copy rules', () => {
  assert.deepEqual(FINAL_GUIDES.map((g) => g.title), [
    'How Your SPRS Score Is Calculated: the 110-Point Math',
    "CMMC POA&M Rules: What Can Wait 180 Days and What Can't",
    'COBRA Notice Penalties: Up to $110 a Day, Plus Medical Bills',
    'Missed Your Medicare Revalidation Due Date? What Happens Next',
    'CPSC eFiling Explained: Certificates, ACE, and the 2027 Deadline',
  ]);
  for (const g of FINAL_GUIDES) {
    assert.ok(g.description.length >= 150 && g.description.length <= 160, `${g.slug}: description ${g.description.length} chars`);
    for (const t of [g.title, g.description, g.blurb, g.crumb]) {
      assert.ok(!DASH.test(t), `${g.slug}: dash in copy`);
      assert.ok(!/SecondRing/i.test(t), `${g.slug}: SecondRing`);
    }
    assert.ok(!/\| SpreadRun/.test(g.title), `${g.slug}: the route adds the brand suffix`);
  }
});

test('primary sources only, and the right CTA per page', () => {
  const live = new Set(APIS.map((a) => `/apis/${a.slug}`));
  for (const g of FINAL_GUIDES) {
    assert.ok(g.sources.length >= 3, `${g.slug}: at least three sources`);
    for (const k of g.sources) assert.ok(SRC[k], `${g.slug}: unknown source ${k}`);
    assert.deepEqual(g.cta, [CTA[g.family]], g.slug);
    const href = g.cta[0];
    assert.ok(live.has(href) || CLIENT.includes(`'${href}': () => import(`), `${g.slug}: CTA ${href} is not a live page`);
  }
  const hosts = /^https:\/\/(www\.ecfr\.gov|www\.cms\.gov|data\.cms\.gov|www\.law\.cornell\.edu|law\.justia\.com|www\.ca5\.uscourts\.gov|www\.federalregister\.gov|www\.govinfo\.gov|www\.cpsc\.gov)\//;
  for (const [label, url] of Object.values(SRC)) assert.match(url, hosts, label);
  for (const k of Object.keys(SRC)) assert.ok(FINAL_GUIDES.some((g) => g.sources.includes(k)), `${k} is cited by no page`);
});

test('SPRS math: the lists in 170.24 give 42 five-point and 14 three-point requirements and a floor of -203', () => {
  const s = section('SprsScore');
  const five = s.slice(s.indexOf("['5 points'"), s.indexOf("['3 points'")).match(/3\.\d+\.\d+/g);
  const three = s.slice(s.indexOf("['3 points'"), s.indexOf("['1 point'")).match(/3\.\d+\.\d+/g);
  assert.equal(new Set(five).size, 42);
  assert.equal(new Set(three).size, 14);
  const ones = 110 - 42 - 14 - 2 - 1; // less the two partial-credit requirements and the SSP (3.12.4), which has no value
  assert.equal(ones, 51);
  assert.equal(110 - (42 * 5 + 2 * 5 + 14 * 3 + ones), -203);
  assert.ok(s.includes('is -203'));
  assert.equal(110 - 5 - 3 - 1 - 3, 98);
  assert.ok(s.includes("'98'") && s.includes('98 out of 110'));
});

test('POA&M rules: the 0.8 threshold, the six excluded requirements and the 180 days', () => {
  const s = section('PoamRules');
  assert.equal(Math.ceil(0.8 * 110), 88);
  assert.ok(88 / 110 >= 0.8 && 87 / 110 < 0.8);
  for (const r of ['3.1.20', '3.1.22', '3.12.4', '3.10.3', '3.10.4', '3.10.5']) assert.ok(s.includes(`L2-${r},`), r);
  assert.match(s, /180 days/);
  assert.match(s, /3\.13\.11/);
});

test('COBRA penalties are never presented as automatic', () => {
  const s = section('CobraPenalty');
  assert.ok(s.includes("in the court's discretion"));
  assert.ok(s.includes('up to $100 a day'));
  assert.ok(s.includes('Neither figure is automatic'));
  assert.ok(!/\$110 (a|per) day (fine|penalty) (applies|is owed)|automatically/i.test(s));
});

test('missed revalidation: the regulation clocks are on the page and the lookup is a link, not a copy', () => {
  const s = section('MissedRevalidation');
  for (const c of ["'60 days'", "'90 days'", "'30 days'", "'15 days'"]) assert.ok(s.includes(c), c);
  assert.ok(s.includes('SRC.revalList[1]'));
});

test('CPSC: only the verified dates and penalty figures, and none of the cut claims', () => {
  const s = section('CpscEfiling');
  for (const d of ['July 8, 2026', 'January 8, 2027', '$120,000', '$17,150,000']) assert.ok(s.includes(d), d);
  const money = s.match(/\$[\d,]+/g) || [];
  assert.deepEqual([...new Set(money)].sort(), ['$120,000', '$17,150,000']);
  assert.ok(!/60[- ]day|storage cost|risk score|delist|cargo hold/i.test(s));
  assert.equal((s.slice(s.indexOf('seven certificate data elements'), s.indexOf('</ol>', s.indexOf('seven certificate data elements'))).match(/<li>/g) || []).length, 7);
});

test('no ranking by frequency, no dashes, no bare "verified"', () => {
  assert.ok(!/most (common|often|frequent)|top reasons?|\b(usually|typically|rarely)\b/i.test(COPY));
  assert.ok(!DASH.test(BODY));
  assert.ok(!/\bverified\b/i.test(COPY));
});
