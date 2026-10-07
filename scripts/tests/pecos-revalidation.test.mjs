// Medicare revalidation calculator: cycle length by provider type (5 years, 3 for DMEPOS), leap days,
// the 90/60/30 countdown, CMS notice timing, overdue dates and bad input.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { revalidation, TYPES, addMonths } from '../../src/site/pecos-revalidation.js';

const ymd = (d) => d.toISOString().slice(0, 10);
const due = (type, baseDate, today = '2026-10-07') => revalidation({ type, baseDate, today });

test('every non-DMEPOS type is on a 5-year cycle (42 CFR 424.515)', () => {
  for (const t of ['individual', 'group', 'institutional', 'ambulance']) {
    const r = due(t, '2022-06-15');
    assert.equal(r.type.years, 5, t);
    assert.equal(ymd(r.due), '2027-06-15', t);
  }
});

test('DMEPOS is on a 3-year cycle (42 CFR 424.57(g))', () => {
  const r = due('dmepos', '2024-03-15');
  assert.equal(r.type.years, 3);
  assert.equal(ymd(r.due), '2027-03-15');
  assert.match(r.type.rule, /424\.57\(g\)/);
});

test('same base date, different types: DMEPOS comes due two years sooner', () => {
  const a = due('individual', '2023-01-31');
  const b = due('dmepos', '2023-01-31');
  assert.equal(ymd(a.due), '2028-01-31');
  assert.equal(ymd(b.due), '2026-01-31');
  assert.equal(b.stage, 'overdue');
});

test('leap day: February 29 plus 3 or 5 years lands on February 28', () => {
  assert.equal(ymd(due('dmepos', '2024-02-29', '2024-03-01').due), '2027-02-28');
  assert.equal(ymd(due('individual', '2024-02-29', '2024-03-01').due), '2029-02-28');
  assert.equal(ymd(addMonths(new Date(Date.UTC(2026, 7, 31)), -7)), '2026-01-31');
  assert.equal(ymd(addMonths(new Date(Date.UTC(2027, 4, 31)), -3)), '2027-02-28');
});

test('countdown: days left and the 90/60/30 marks', () => {
  // DMEPOS revalidated 2023-12-31, due 2026-12-31; today 2026-10-07 is 85 days out.
  const r = due('dmepos', '2023-12-31');
  assert.equal(ymd(r.due), '2026-12-31');
  assert.equal(r.daysLeft, 85);
  assert.equal(r.stage, 'd90');
  assert.deepEqual(r.countdown.map((c) => [c.days, ymd(c.date), c.reached]), [
    [90, '2026-10-02', true], [60, '2026-11-01', false], [30, '2026-12-01', false],
  ]);
  assert.equal(due('dmepos', '2023-12-31', '2026-11-01').stage, 'd60');
  assert.equal(due('dmepos', '2023-12-31', '2026-12-01').stage, 'd30');
  assert.equal(due('dmepos', '2023-12-31', '2026-12-31').daysLeft, 0);
  assert.equal(due('dmepos', '2023-12-31', '2026-12-31').stage, 'd30');
  const late = due('dmepos', '2023-12-31', '2027-01-10');
  assert.equal(late.daysLeft, -10);
  assert.equal(late.stage, 'overdue');
});

test('CMS timing marks: list posting 7 months, notice about 4 months, revalidate within 3 months', () => {
  const r = due('individual', '2022-06-15');
  const m = Object.fromEntries(r.marks.map((x) => [x.id, ymd(x.date)]));
  assert.equal(m.list, '2026-11-15');
  assert.equal(m.notice, '2027-02-15');
  assert.equal(m.three, '2027-03-15');
  assert.equal(m.due, '2027-06-15');
  assert.equal(r.stage, 'early');
  assert.equal(due('individual', '2022-06-15', '2026-11-15').stage, 'window');
});

test('bad input is refused', () => {
  assert.ok(due('nope', '2024-01-01').error);
  assert.ok(due('individual', '').error);
  assert.ok(due('individual', '2024-02-30').error);
  assert.ok(due('individual', '2027-01-01').error, 'future base date');
  assert.equal(TYPES.length, 5);
});

test('the page: CMS sources, disclaimer, consequences, CTA line, live countdown, no network calls, no dashes', () => {
  const page = fs.readFileSync(new URL('../../src/pages/PecosRevalidation.jsx', import.meta.url), 'utf8');
  const lib = fs.readFileSync(new URL('../../src/site/pecos-revalidation.js', import.meta.url), 'utf8');
  for (const s of [page, lib]) {
    assert.ok(!/[–—−]/.test(s));
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon/.test(s));
  }
  assert.match(page, /informational only and is not legal advice/);
  assert.match(page, /Revalidations get denied for the same enrollment errors the pre-check catches\./);
  assert.match(page, /pecos-enrollment-precheck/);
  assert.match(page, /setInterval/);
  assert.match(page, /<ToolSignup /);
  for (const c of ['424.540', '424.555', '424.515', '424.57', 'CMS_REVAL', 'CMS_LIST']) assert.ok(page.includes(c), c);
  assert.match(lib, /cms\.gov\/medicare\/enrollment-renewal\/providers-suppliers\/revalidations/);
  assert.match(lib, /ecfr\.gov\/current\/title-42/);
});
