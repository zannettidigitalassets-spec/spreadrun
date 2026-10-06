// COBRA deadline calculator: every date the free tool shows, including month-end and leap-year cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cobraDeadlines, addDays, addMonths, parseDate, iso, EVENTS } from '../../src/site/cobra-deadlines.js';

const d = (s) => parseDate(s);
const step = (r, id) => r.steps.find((s) => s.id === id);
const date = (r, id) => (step(r, id)?.date ? iso(step(r, id).date) : null);

test('date helpers: days and calendar months, month end and leap years', () => {
  assert.equal(iso(addDays(d('2026-01-15'), 44)), '2026-02-28');
  assert.equal(iso(addDays(d('2028-02-29'), 1)), '2028-03-01');
  assert.equal(iso(addDays(d('2027-12-31'), 1)), '2028-01-01');
  assert.equal(iso(addMonths(d('2026-01-15'), 18)), '2027-07-15');
  assert.equal(iso(addMonths(d('2026-08-31'), 1)), '2026-09-30');
  assert.equal(iso(addMonths(d('2026-08-31'), 6)), '2027-02-28');
  assert.equal(iso(addMonths(d('2027-08-31'), 6)), '2028-02-29');
  assert.equal(iso(addMonths(d('2028-02-29'), 18)), '2029-08-29');
  assert.equal(iso(addMonths(d('2028-02-29'), 36)), '2031-02-28');
  assert.equal(iso(addMonths(d('2028-02-29'), 48)), '2032-02-29');
  assert.equal(iso(addMonths(d('2026-01-31'), 1)), '2026-02-28');
  assert.equal(iso(addMonths(d('2026-12-15'), 1)), '2027-01-15');
  assert.equal(parseDate('2027-02-29'), null);
  assert.equal(parseDate('2026-13-01'), null);
  assert.equal(parseDate('not a date'), null);
});

test('acceptance 2: termination on 2026-01-15, employer is the administrator', () => {
  const r = cobraDeadlines({ event: 'termination', eventDate: '2026-01-15', administrator: 'employer' });
  assert.equal(date(r, 'election-notice'), '2026-02-28');
  assert.equal(step(r, 'election-notice').days, 44);
  assert.match(step(r, 'election-notice').detail, /30 days.*14 days/);
  assert.equal(step(r, 'employer-notice'), undefined);
  // 60 days after the later of coverage end (January 15) and the notice deadline (February 28).
  assert.equal(date(r, 'election'), '2026-04-29');
  assert.equal(date(r, 'first-payment'), '2026-06-13');
  assert.equal(step(r, 'first-payment').example, true);
  assert.equal(date(r, 'max'), '2027-07-15');
  assert.equal(step(r, 'max').months, 18);
});

test('acceptance 3: divorce, beneficiary duty to report then 14 days, 36 months', () => {
  const r = cobraDeadlines({ event: 'divorce', eventDate: '2026-03-10', administrator: 'employer' });
  assert.equal(step(r, 'employer-notice'), undefined);
  assert.equal(date(r, 'beneficiary-notice'), '2026-05-09');
  assert.equal(step(r, 'beneficiary-notice').days, 60);
  assert.equal(date(r, 'election-notice'), '2026-05-23');
  assert.equal(step(r, 'election-notice').days, 14);
  assert.equal(date(r, 'election'), '2026-07-22');
  assert.equal(date(r, 'max'), '2029-03-10');
  assert.equal(step(r, 'max').months, 36);
  // The beneficiary clock runs from the later of the event and the loss of coverage.
  const r2 = cobraDeadlines({ event: 'dependent', eventDate: '2026-03-10', coverageEnd: '2026-03-31' });
  assert.equal(date(r2, 'beneficiary-notice'), '2026-05-30');
});

test('acceptance 4: reduction in hours with a separate administrator, two dated steps', () => {
  const r = cobraDeadlines({ event: 'hours', eventDate: '2026-06-01', administrator: 'separate' });
  assert.equal(date(r, 'employer-notice'), '2026-07-01');
  assert.equal(step(r, 'employer-notice').days, 30);
  assert.equal(date(r, 'election-notice'), '2026-07-15');
  assert.equal(step(r, 'election-notice').days, 14);
  assert.equal(date(r, 'max'), '2027-12-01');
  assert.equal(r.steps.findIndex((s) => s.id === 'employer-notice') < r.steps.findIndex((s) => s.id === 'election-notice'), true);
});

test('acceptance 5: a 2028-02-29 event date', () => {
  const t = cobraDeadlines({ event: 'termination', eventDate: '2028-02-29' });
  assert.equal(date(t, 'election-notice'), '2028-04-13');
  assert.equal(date(t, 'max'), '2029-08-29');
  const m = cobraDeadlines({ event: 'medicare', eventDate: '2028-02-29' });
  assert.equal(date(m, 'max'), '2031-02-28');
  const a = cobraDeadlines({ event: 'death', eventDate: '2026-08-31', administrator: 'separate' });
  assert.equal(date(a, 'employer-notice'), '2026-09-30');
  assert.equal(date(a, 'max'), '2029-08-31');
});

test('coverage ending later: the election period runs from the later date', () => {
  const r = cobraDeadlines({ event: 'termination', eventDate: '2026-01-15', coverageEnd: '2026-04-30' });
  assert.equal(date(r, 'election-notice'), '2026-02-28');
  assert.equal(date(r, 'election'), '2026-06-29');
  assert.equal(date(r, 'max'), '2027-07-15');
  assert.ok(r.notes.some((n) => /still run from the event date/.test(n)));
});

test('plan that measures from the loss of coverage shifts the notice and the coverage period', () => {
  const r = cobraDeadlines({ event: 'termination', eventDate: '2026-01-15', coverageEnd: '2026-01-31', fromLossOfCoverage: true });
  assert.equal(date(r, 'election-notice'), '2026-03-16');
  assert.equal(date(r, 'max'), '2027-07-31');
});

test('bankruptcy has no fixed month count, every other event does', () => {
  const r = cobraDeadlines({ event: 'bankruptcy', eventDate: '2026-05-01' });
  assert.equal(step(r, 'max').date, null);
  assert.match(step(r, 'max').detail, /until death/);
  for (const e of EVENTS) if (e.id !== 'bankruptcy') assert.ok([18, 36].includes(e.months), e.id);
  assert.deepEqual(EVENTS.filter((e) => e.months === 18).map((e) => e.id), ['termination', 'hours']);
  assert.deepEqual(EVENTS.filter((e) => e.notice === 'beneficiary').map((e) => e.id), ['divorce', 'dependent']);
});

test('bad input is refused, not guessed', () => {
  assert.ok(cobraDeadlines({ event: 'termination', eventDate: '' }).error);
  assert.ok(cobraDeadlines({ event: 'nope', eventDate: '2026-01-01' }).error);
  assert.ok(cobraDeadlines({ event: 'termination', eventDate: '2026-02-01', coverageEnd: '2026-01-01' }).error);
});

test('the page: no network calls, disclaimer, email capture, CTA, no dashes', () => {
  const src = fs.readFileSync(new URL('../../src/pages/CobraDeadline.jsx', import.meta.url), 'utf8');
  const lib = fs.readFileSync(new URL('../../src/site/cobra-deadlines.js', import.meta.url), 'utf8');
  for (const s of [src, lib]) {
    assert.ok(!/[–—−]/.test(s));
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon/.test(s));
  }
  assert.match(src, /not legal advice/);
  assert.match(src, /<ToolSignup /);
  assert.match(src, /href=\{COBRA_API\}|href="\/apis\/cobra-notice-qa"/);
  assert.match(src, /check the notice content before it goes out/i);
});
