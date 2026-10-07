// ACA FTE calculator: worked examples (including the IRS's own), the 49.9 vs 50.0 boundary, seasonal workers,
// and the Form 1095-C deadlines.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aleStatus, sameEveryMonth, reportingDeadlines } from '../../src/site/aca-fte.js';

const same = (ft, hrs) => aleStatus({ months: sameEveryMonth(ft, hrs) });
const ymd = (d) => d.toISOString().slice(0, 10);

test('IRS Example 1: 40 full-time and 900 part-time hours is 47.5, rounded down to 47, not an ALE', () => {
  const r = same(40, 900);
  assert.equal(r.rows[0].fte, 7.5);
  assert.equal(r.average, 47.5);
  assert.equal(r.count, 47);
  assert.equal(r.ale, false);
});

test('IRS Example 2: 40 full-time and 1,200 part-time hours is exactly 50, an ALE', () => {
  const r = same(40, 1200);
  assert.equal(r.count, 50);
  assert.equal(r.ale, true);
});

test('boundary: 49.9 rounds down to 49 (not an ALE); 50.0 is an ALE', () => {
  const low = same(45, 588); // 588 / 120 = 4.9
  assert.equal(Math.round(low.average * 10) / 10, 49.9);
  assert.equal(low.count, 49);
  assert.equal(low.ale, false);
  const high = same(45, 600); // 600 / 120 = 5
  assert.equal(high.count, 50);
  assert.equal(high.ale, true);
});

test('seasonal workforce: over 50 for four months with seasonal workers is not an ALE; five months is', () => {
  const months = Array.from({ length: 12 }, (_, i) => ({ fullTime: i >= 8 ? 60 : 45, partTimeHours: 0 }));
  // 45 x 8 + 60 x 4 = 600, / 12 = 50
  const four = aleStatus({ months, seasonal: true });
  assert.equal(four.count, 50);
  assert.equal(four.monthsOver, 4);
  assert.equal(four.seasonalApplies, true);
  assert.equal(four.ale, false);
  assert.equal(aleStatus({ months, seasonal: false }).ale, true, 'without seasonal workers the exception does not apply');
  const five = Array.from({ length: 12 }, (_, i) => ({ fullTime: i >= 7 ? 60 : 45, partTimeHours: 0 }));
  const r5 = aleStatus({ months: five, seasonal: true });
  assert.equal(r5.monthsOver, 5);
  assert.equal(r5.exceptionAvailable, false);
  assert.equal(r5.ale, true);
});

test('fractions count every month: 30 full-time plus 2,410 hours a month', () => {
  const r = same(30, 2410); // 20.0833 FTEs a month
  assert.equal(r.rows[0].fteRounded, 20.08);
  assert.equal(r.count, 50);
  assert.equal(r.ale, true);
});

test('small employer: 10 full-time and 300 hours is 12, not an ALE', () => {
  assert.equal(same(10, 300).count, 12);
});

test('bad input is refused', () => {
  assert.ok(same('', 100).error);
  assert.ok(same(-1, 100).error);
  assert.ok(same(10.5, 100).error);
  assert.ok(aleStatus({ months: [] }).error);
});

test('Form 1095-C deadlines: 2025 matches the IRS instructions; 2026 follows the same rules', () => {
  const y25 = reportingDeadlines(2025);
  assert.deepEqual([ymd(y25.furnish), ymd(y25.paper), ymd(y25.electronic)], ['2026-03-02', '2026-03-02', '2026-03-31']);
  const y26 = reportingDeadlines(2026);
  assert.deepEqual([ymd(y26.furnish), ymd(y26.paper), ymd(y26.electronic)], ['2027-03-02', '2027-03-01', '2027-03-31']);
});

test('the page: IRS sources, disclaimer, controlled group note, deadline-alert signup, no network calls, no dashes', () => {
  const page = fs.readFileSync(new URL('../../src/pages/AcaFte.jsx', import.meta.url), 'utf8');
  const lib = fs.readFileSync(new URL('../../src/site/aca-fte.js', import.meta.url), 'utf8');
  for (const s of [page, lib]) {
    assert.ok(!/[–—−]/.test(s));
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon/.test(s));
  }
  assert.match(page, /informational only and is not legal advice/);
  assert.match(page, /section 414/);
  assert.match(page, /1095-C filing season deadline alerts/);
  assert.match(page, /<ToolSignup /);
  for (const u of ['IRS_ALE', 'IRS_INSTR', 'ECFR_ALE', 'ECFR_6056', 'IRS_ESRP']) assert.match(page, new RegExp(u));
  assert.match(lib, /irs\.gov\/instructions\/i109495c/);
});
