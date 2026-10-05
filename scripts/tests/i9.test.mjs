import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEDERAL_HOLIDAYS, iso, parseDate, section2Deadline } from '../../src/site/i9.js';

const due = (s, o) => iso(section2Deadline(s, o).deadline);

test('M-274 example: a Monday start is due Thursday', () => {
  assert.equal(due('2026-01-05'), '2026-01-08');
  assert.equal(section2Deadline('2026-01-05').deadline.getUTCDay(), 4);
});

test('weekends and federal holidays are skipped', () => {
  // Thursday July 2 2026: Friday July 3 is Independence Day observed, then the weekend.
  assert.equal(due('2026-07-02'), '2026-07-08');
  assert.deepEqual(section2Deadline('2026-07-02').skipped.map((s) => s.date), ['2026-07-03', '2026-07-04', '2026-07-05']);
  // Friday before Labor Day 2026.
  assert.equal(due('2026-09-04'), '2026-09-10');
  // Wednesday before Thanksgiving 2026.
  assert.equal(due('2026-11-25'), '2026-12-01');
  // Christmas 2027 observed Friday December 24, New Year's 2028 observed Friday December 31.
  assert.equal(due('2027-12-22'), '2027-12-28');
  assert.equal(due('2027-12-29'), '2028-01-04');
  // A Friday start without holidays.
  assert.equal(due('2026-01-09'), '2026-01-14');
});

test('days the business is open count when asked', () => {
  assert.equal(due('2026-07-02', { openSaturday: true, openSunday: true, openHolidays: true }), '2026-07-05');
  assert.equal(due('2026-07-02', { openSaturday: true }), '2026-07-07');
  assert.equal(due('2026-01-09', { openSaturday: true }), '2026-01-13');
});

test('short engagements are due the first day', () => {
  assert.equal(due('2026-03-10', { shortTerm: true }), '2026-03-10');
});

test('holiday table matches OPM and input parsing is strict', () => {
  assert.equal(Object.keys(FEDERAL_HOLIDAYS).filter((d) => d.startsWith('2026')).length, 11);
  assert.equal(Object.keys(FEDERAL_HOLIDAYS).filter((d) => d.startsWith('2027')).length, 12);
  for (const d of Object.keys(FEDERAL_HOLIDAYS)) assert.ok(![0, 6].includes(parseDate(d).getUTCDay()), d);
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate(''), null);
  assert.equal(section2Deadline('nope'), null);
  assert.equal(section2Deadline('2025-12-01').holidaysCovered, false);
});
