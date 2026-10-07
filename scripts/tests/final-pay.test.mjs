// Final paycheck deadline tool: date math for immediate, next-payday and fixed-day states, plus data rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STATES, TYPES, finalPayDeadline, addBusinessDays, parseDate, iso } from '../../src/site/final-pay.js';

const due = (state, type, separation, extra = {}) => {
  const r = finalPayDeadline({ state, type, separation, ...extra });
  assert.ok(!r.error, r.error);
  return r;
};
const d = (r) => (r.date ? iso(r.date) : null);
// Friday October 2, 2026 is the last day in most cases below; the next payday is Friday October 9.
const FRI = '2026-10-02';
const PAY = '2026-10-09';

test('all 50 states and DC, every separation type, every row sourced from an official site', () => {
  assert.equal(STATES.length, 51);
  assert.equal(new Set(STATES.map((s) => s.code)).size, 51);
  for (const s of STATES) {
    for (const t of TYPES) assert.ok(s[t.id] && s[t.id].k, `${s.code} ${t.id}`);
    assert.ok(s.sources.length >= 1, s.code);
    for (const [label, url] of s.sources) {
      assert.match(url, /^https:\/\/[^/]*(\.gov|\.us|legmt\.gov|nmonesource\.com|oscn\.net|ksrevisor\.gov)\//, `${s.code}: ${label}`);
      assert.ok(!/justia|cornell|findlaw|nolo|paycor/i.test(url), `${s.code}: secondary source`);
    }
    assert.ok(s.note && s.penalty, s.code);
  }
});

test('immediate states: California, Colorado, Massachusetts, Missouri, Nevada, Michigan', () => {
  assert.equal(d(due('CA', 'fired', FRI)), FRI);
  assert.equal(d(due('CA', 'quitNotice', FRI)), FRI);
  assert.equal(d(due('CA', 'quitNoNotice', FRI)), '2026-10-05'); // 72 hours
  assert.equal(d(due('CO', 'fired', FRI)), FRI);
  assert.equal(d(due('CO', 'quitNoNotice', FRI, { payday: PAY })), PAY);
  assert.equal(d(due('MA', 'fired', FRI)), FRI);
  assert.equal(d(due('MO', 'fired', FRI)), FRI);
  assert.ok(due('MO', 'quitNoNotice', FRI).noLaw);
  assert.equal(d(due('NV', 'laidoff', FRI)), FRI);
  assert.equal(d(due('MI', 'quitNoNotice', FRI)), FRI);
  assert.ok(due('MI', 'fired', FRI).flag);
});

test('next payday states: New York, Pennsylvania, Virginia, Kansas, New Jersey', () => {
  for (const s of ['NY', 'PA', 'VA', 'KS', 'NJ']) {
    for (const t of ['fired', 'quitNoNotice']) {
      assert.equal(d(due(s, t, FRI, { payday: PAY })), PAY, `${s} ${t}`);
      assert.equal(d(due(s, t, FRI)), null, `${s} ${t} without a payday`);
    }
  }
});

test('fixed-day and hour states: Texas, Utah, Vermont, New Hampshire, New Mexico, South Carolina', () => {
  assert.equal(d(due('TX', 'fired', FRI)), '2026-10-08'); // sixth day
  assert.equal(d(due('TX', 'quitNoNotice', FRI, { payday: PAY })), PAY);
  assert.equal(d(due('UT', 'fired', FRI)), '2026-10-03'); // 24 hours
  assert.equal(d(due('VT', 'fired', FRI)), '2026-10-05'); // 72 hours
  assert.equal(d(due('NH', 'fired', FRI)), '2026-10-05');
  assert.equal(d(due('NM', 'fired', FRI)), '2026-10-07'); // 5 days
  assert.equal(d(due('SC', 'quitNoNotice', FRI)), '2026-10-04'); // 48 hours
  assert.ok(due('SC', 'fired', FRI).flag);
});

test('business days skip weekends: Connecticut, DC, Oregon, Alaska, Arizona, Idaho', () => {
  assert.equal(iso(addBusinessDays(parseDate(FRI), 1)), '2026-10-05');
  assert.equal(d(due('CT', 'fired', FRI)), '2026-10-05');
  assert.equal(d(due('DC', 'fired', FRI)), '2026-10-05');
  assert.equal(d(due('OR', 'fired', FRI)), '2026-10-05');
  assert.equal(d(due('AK', 'fired', FRI)), '2026-10-07'); // 3 working days
  // Arizona: 7 working days or end of next pay period, whichever is sooner.
  assert.equal(d(due('AZ', 'fired', FRI, { periodEnd: '2026-10-10' })), '2026-10-10');
  assert.equal(d(due('AZ', 'fired', FRI, { periodEnd: '2026-10-17' })), '2026-10-13');
  const az = due('AZ', 'fired', FRI);
  assert.equal(az.date, null);
  assert.equal(iso(az.bound), '2026-10-13');
  assert.equal(az.boundKind, 'noLaterThan');
  // Idaho: earlier of the next payday or 10 business days.
  assert.equal(d(due('ID', 'quitNoNotice', FRI, { payday: '2026-10-30' })), '2026-10-16');
  assert.equal(d(due('ID', 'quitNoNotice', FRI, { payday: PAY })), PAY);
});

test('earlier-of and later-of rules: Louisiana, Nebraska, Nevada, Kentucky, Tennessee, Delaware', () => {
  assert.equal(d(due('LA', 'fired', FRI, { payday: '2026-10-30' })), '2026-10-17'); // 15 days first
  assert.equal(d(due('LA', 'fired', FRI, { payday: PAY })), PAY);
  assert.equal(d(due('NE', 'quitNoNotice', FRI, { payday: '2026-10-30' })), '2026-10-16');
  assert.equal(d(due('NV', 'quitNoNotice', FRI, { payday: '2026-10-30' })), '2026-10-09');
  assert.equal(d(due('KY', 'fired', FRI, { payday: PAY })), '2026-10-16'); // later: 14 days
  assert.equal(d(due('KY', 'fired', FRI, { payday: '2026-10-30' })), '2026-10-30');
  assert.equal(d(due('TN', 'fired', FRI, { payday: PAY })), '2026-10-23'); // later: 21 days
  const tn = due('TN', 'fired', FRI);
  assert.equal(iso(tn.bound), '2026-10-23');
  assert.equal(tn.boundKind, 'orLater');
  assert.equal(d(due('DE', 'fired', FRI, { payday: '2026-10-05' })), '2026-10-07'); // 3 business days later
});

test('notice and layoff distinctions: Hawaii, New Hampshire, Oregon, Connecticut, Montana', () => {
  assert.equal(d(due('HI', 'quitNotice', FRI, { payday: PAY })), PAY, 'without a full pay period of notice');
  assert.equal(d(due('HI', 'quitNotice', FRI, { payday: PAY, onePeriodNotice: true })), FRI);
  assert.equal(d(due('NH', 'quitNotice', FRI, { payday: PAY, onePeriodNotice: true })), '2026-10-05');
  assert.equal(d(due('NH', 'laidoff', FRI, { payday: PAY })), PAY);
  assert.equal(d(due('OR', 'quitNotice', FRI)), FRI);
  assert.equal(d(due('OR', 'quitNoNotice', FRI, { payday: '2026-10-30' })), '2026-10-09');
  assert.equal(d(due('CT', 'laidoff', FRI, { payday: PAY })), PAY);
  assert.equal(d(due('MT', 'quitNoNotice', FRI, { payday: '2026-10-30' })), '2026-10-17');
});

test('Minnesota quit: first payday, or up to 20 days when the first payday is under 5 days away', () => {
  assert.equal(d(due('MN', 'quitNoNotice', FRI, { payday: PAY })), PAY);
  assert.equal(d(due('MN', 'quitNoNotice', FRI, { payday: '2026-10-05' })), '2026-10-22');
  assert.equal(d(due('MN', 'fired', FRI)), FRI);
});

test('no-law states say so and fall back to the next payday', () => {
  for (const s of ['AL', 'FL', 'GA', 'MS']) {
    const r = due(s, 'fired', FRI, { payday: PAY });
    assert.ok(r.noLaw, s);
    assert.equal(d(r), PAY);
  }
});

test('bad input is refused', () => {
  assert.ok(finalPayDeadline({ state: 'CA', type: 'fired', separation: '' }).error);
  assert.ok(finalPayDeadline({ state: 'ZZ', type: 'fired', separation: FRI }).error);
  assert.ok(finalPayDeadline({ state: 'CA', type: 'fired', separation: FRI, payday: '2026-09-01' }).error);
});

test('the page: no network calls, disclaimer, email capture, CTA, no dashes', () => {
  const src = fs.readFileSync(new URL('../../src/pages/FinalPaycheck.jsx', import.meta.url), 'utf8');
  const lib = fs.readFileSync(new URL('../../src/site/final-pay.js', import.meta.url), 'utf8');
  for (const s of [src, lib]) {
    assert.ok(!/[–—−]/.test(s));
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon/.test(s));
  }
  assert.match(src, /informational only and is not legal advice/);
  assert.match(src, /<ToolSignup /);
  assert.match(src, /wh347-payroll-precheck/);
  assert.match(src, /Same payroll team, same compliance headaches/);
});
