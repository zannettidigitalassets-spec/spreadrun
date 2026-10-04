import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDailyHours, zeroRnDays, mealBreak, toCmsTenths, ZERO_RN_DAY_LIMIT } from '../../src/site/pbjPreflight.js';

test('threshold is the Five-Star four-day rule', () => assert.equal(ZERO_RN_DAY_LIMIT, 4));

test('zero-RN days: one per line, comma separated, and date,hours CSV', () => {
  assert.deepEqual(zeroRnDays(parseDailyHours('8\n8\n0\n12\n0\n0').days).count, 3);
  assert.equal(zeroRnDays(parseDailyHours('8, 0, 0, 0, 0, 7.5').days).oneStar, true);
  const csv = parseDailyHours('date,hours\n2026-07-01,8\n2026-07-02,0\n2026-07-03,0\n2026-07-04,0\n2026-07-05,0\n2026-07-06,16');
  assert.deepEqual([csv.days.length, csv.errors.length], [6, 0]);
  const r = zeroRnDays(csv.days);
  assert.deepEqual([r.count, r.oneStar, r.zeroDays[0].label], [4, true, '2026-07-02']);
  assert.equal(zeroRnDays(parseDailyHours('0\n0\n0\n8').days).oneStar, false);   // three days: below the rule
  assert.deepEqual(parseDailyHours('8\nabc\n-1').errors, [2, 3]);
});

test('CMS minute conversion table', () => {
  assert.deepEqual([1, 6, 7, 12, 30, 31, 33, 54, 55, 60].map(toCmsTenths), [0.1, 0.1, 0.2, 0.2, 0.5, 0.6, 0.6, 0.9, 1.0, 1.0]);
});

test('meal break presets match the PBJ Policy Manual examples', () => {
  // 8-hour shift, paid 8 hours including a 30-minute paid meal: report 7.5.
  assert.equal(mealBreak({ paidMinutes: 480, breakPaid: true }).tenths, 7.5);
  // 8-hour shift, paid 7.5 hours with a 30-minute unpaid meal: report 7.5.
  assert.equal(mealBreak({ paidMinutes: 450, breakPaid: false }).tenths, 7.5);
  // 12-hour shift, paid 12 hours including a paid meal: report 11.5.
  assert.equal(mealBreak({ paidMinutes: 720, breakPaid: true }).tenths, 11.5);
  // 16 hours as two 8-hour shifts, paid meals: two deductions, report 15.
  assert.equal(mealBreak({ paidMinutes: 960, breakPaid: true, shifts: 2 }).tenths, 15);
  // A 45-minute paid break on an 8-hour shift: the actual break comes out, 7.25 hours (7.3 in tenths).
  const long = mealBreak({ paidMinutes: 480, breakPaid: true, breakMinutes: 45 });
  assert.deepEqual([long.reportMinutes, long.hundredths, long.tenths], [435, 7.25, 7.3]);
  // A 15-minute unpaid break: the other 15 minutes still come out.
  assert.equal(mealBreak({ paidMinutes: 465, breakPaid: false, breakMinutes: 15 }).tenths, 7.5);
});
