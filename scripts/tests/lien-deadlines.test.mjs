// Mechanics lien deadline calculator: date math across notice-required, no-notice and tiered states, plus data rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LIEN_STATES, lienDeadlines, iso, addBusinessDays, parseDate } from '../../src/site/lien-deadlines.js';

// First furnishing Tuesday March 10, 2026; last furnishing Monday July 20, 2026.
const F = '2026-03-10';
const L = '2026-07-20';
const run = (state, type, role, extra = {}) => {
  const r = lienDeadlines({ state, type, role, first: F, last: L, ...extra });
  assert.ok(!r.error, r.error);
  return r;
};
const d = (x) => (x && x.date ? iso(x.date) : null);
const d2 = (x) => (x && x.lastDate ? iso(x.lastDate) : null);

test('notice-required states: California, Arizona, Florida, Utah', () => {
  let r = run('CA', 'com', 'sup');
  assert.deepEqual([d(r.notice), d(r.lien), d(r.suit)], ['2026-03-30', '2026-08-19', '2026-11-17']);
  assert.ok(r.lien.flag && r.suit.assumed);
  assert.equal(d(run('CA', 'com', 'gc').lien), '2026-09-18');
  r = run('AZ', 'com', 'sub');
  assert.deepEqual([d(r.notice), d(r.lien), d(r.suit)], ['2026-03-30', '2026-09-18', '2027-03-18']);
  assert.ok(run('AZ', 'res', 'sub').lien.flag.includes('owner-occupant'));
  r = run('FL', 'com', 'sub');
  assert.deepEqual([d(r.notice), d(r.lien), d(r.suit)], ['2026-04-24', '2026-10-18', '2027-10-18']);
  assert.equal(run('FL', 'com', 'gc').notice.kind, 'none');
  r = run('UT', 'com', 'sub');
  assert.deepEqual([d(r.notice), d(r.lien), d(r.suit)], ['2026-03-30', '2026-10-18', '2027-04-16']);
});

test('no-notice states: New York, Colorado, New Jersey commercial, West Virginia', () => {
  let r = run('NY', 'com', 'sub');
  assert.equal(r.notice.kind, 'none');
  assert.equal(d(r.lien), '2027-03-20');
  assert.equal(d(run('NY', 'res', 'sub').lien), '2026-11-20');
  r = run('CO', 'com', 'sup');
  assert.deepEqual([r.notice.kind, d(r.lien), d(r.suit)], ['none', '2026-11-20', '2027-01-20']);
  r = run('NJ', 'com', 'sub');
  assert.deepEqual([r.notice.kind, d(r.lien), d(r.suit)], ['none', '2026-10-18', '2027-07-20']);
  assert.equal(d(run('NJ', 'res', 'sub').notice), '2026-09-18');
  r = run('WV', 'com', 'gc');
  assert.deepEqual([r.notice.kind, d(r.lien), d(r.suit)], ['none', '2026-10-28', '2027-04-28']);
});

test('tiered and monthly regimes: Texas commercial and residential', () => {
  let r = run('TX', 'com', 'sub');
  assert.deepEqual([d(r.notice), d2(r.notice), d(r.lien), d(r.suit)], ['2026-06-15', '2026-10-15', '2026-11-15', '2027-11-15']);
  r = run('TX', 'res', 'sub');
  assert.deepEqual([d(r.notice), d2(r.notice), d(r.lien)], ['2026-05-15', '2026-09-15', '2026-10-15']);
  assert.equal(run('TX', 'com', 'gc').notice.kind, 'none');
});

test('notice tied to the lien date: Pennsylvania and Missouri', () => {
  let r = run('PA', 'com', 'sub');
  assert.deepEqual([d(r.notice), d(r.lien), d(r.suit)], ['2026-12-21', '2027-01-20', '2029-01-20']);
  r = run('MO', 'com', 'sup');
  assert.deepEqual([d(r.notice), d(r.lien), d(r.suit)], ['2027-01-10', '2027-01-20', '2027-07-20']);
});

test('public works: Kentucky monthly claims, Illinois, Massachusetts, prime contractor not applicable', () => {
  let r = run('KY', 'pub', 'sup');
  assert.deepEqual([d(r.lien), d2(r.lien), d(r.suit)], ['2026-05-30', '2026-09-29', '2026-11-30']);
  r = run('IL', 'pub', 'sub');
  assert.deepEqual([r.notice.kind, d(r.lien), d(r.suit)], ['none', '2027-01-16', '2027-07-20']);
  r = run('MA', 'pub', 'sup');
  assert.deepEqual([d(r.lien), d(r.suit)], ['2026-09-23', '2027-07-20']);
  r = run('PA', 'pub', 'gc');
  assert.deepEqual([r.notice.kind, r.lien.kind, r.suit.kind], ['na', 'na', 'na']);
});

test('business days and other notice styles: Oregon, Illinois, Massachusetts private', () => {
  assert.equal(iso(addBusinessDays(parseDate(F), 8)), '2026-03-20');
  assert.equal(d(run('OR', 'com', 'sup').notice), '2026-03-20');
  assert.equal(run('OR', 'com', 'sub').notice.kind, 'none');
  const il = run('IL', 'com', 'sub');
  assert.deepEqual([d(il.notice), d(il.lien), d(il.suit)], ['2026-10-18', '2026-11-20', '2028-07-20']);
  const ma = run('MA', 'com', 'sub');
  assert.deepEqual([d(ma.lien), d(ma.suit)], ['2026-10-18', '2027-01-16']);
});

test('a lien filing date you enter moves the suit deadline', () => {
  const r = run('CA', 'com', 'sub', { lienDate: '2026-08-01' });
  assert.equal(d(r.suit), '2026-10-30');
  assert.ok(!r.suit.assumed);
});

test('states without a free official code say so instead of guessing', () => {
  for (const s of ['GA', 'AR', 'MS', 'TN']) {
    const r = run(s, 'com', 'sub');
    assert.ok(r.unread, s);
    assert.equal(r.lien, undefined);
  }
});

test('bad input is refused', () => {
  assert.ok(lienDeadlines({ state: 'ZZ', type: 'com', role: 'sub', first: F, last: L }).error);
  assert.ok(lienDeadlines({ state: 'CA', type: 'com', role: 'sub', first: L, last: F }).error);
  assert.ok(lienDeadlines({ state: 'CA', type: 'com', role: 'sub', first: '', last: L }).error);
  assert.ok(lienDeadlines({ state: 'CA', type: 'x', role: 'sub', first: F, last: L }).error);
});

test('all 50 states and DC; every computed rule cites a statute on an official site', () => {
  assert.equal(LIEN_STATES.length, 51);
  const read = LIEN_STATES.filter((s) => !s.unread);
  assert.equal(read.length, 47);
  for (const s of read) {
    for (const type of ['com', 'res', 'pub']) {
      for (const role of ['gc', 'sub', 'sup']) {
        const r = lienDeadlines({ state: s.code, type, role, first: F, last: L });
        for (const step of ['notice', 'lien', 'suit']) {
          const x = r[step];
          assert.ok(x.text, `${s.code} ${type} ${role} ${step}`);
          if (x.kind === 'na') continue;
          assert.ok(x.cite || /not confirmed/i.test(x.text), `${s.code} ${type} ${role} ${step} cite`);
          if (['days', 'months', 'bdays', 'monthDay', 'monthEndDays', 'beforeLien'].includes(x.kind)) assert.ok(x.date, `${s.code} ${step} date`);
        }
      }
    }
    for (const [, url] of s.sources) {
      assert.match(url, /^https:\/\/[^/]*(\.gov|\.us|nmonesource\.com|oscn\.net|ksrevisor\.gov)\//, `${s.code}: ${url}`);
      assert.ok(!/justia|cornell|findlaw|nolo|levelset|vlex/i.test(url), s.code);
    }
  }
});

test('the page: disclaimer, Miller Act scope note, attorney flag, CTA, email capture, no network calls, no dashes', () => {
  const page = fs.readFileSync(new URL('../../src/pages/LienDeadline.jsx', import.meta.url), 'utf8');
  const lib = fs.readFileSync(new URL('../../src/site/lien-deadlines.js', import.meta.url), 'utf8');
  const data = fs.readFileSync(new URL('../../src/site/lien-states.js', import.meta.url), 'utf8');
  for (const s of [page, lib, data]) {
    assert.ok(!/[–—−]/.test(s));
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon/.test(s));
  }
  assert.match(page, /informational only and is not legal advice/);
  assert.match(page, /Miller Act/);
  assert.match(lib, /Confirm with a construction attorney in this state\./);
  assert.match(page, /<ToolSignup /);
  assert.match(page, /wh347-payroll-precheck/);
});
