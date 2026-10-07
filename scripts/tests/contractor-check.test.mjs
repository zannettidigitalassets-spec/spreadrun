// Contractor vs employee check: worked scenarios with known outcomes, state layering, and data rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  FACTORS, STATE_TESTS, E, N, C, federalRating, overall, stateTests, stateQuestions, stateTestResult,
} from '../../src/site/contractor-check.js';

const all = (v) => Object.fromEntries(FACTORS.map((f) => [f.id, v]));
const mix = (o) => ({ ...all(N), ...o });
const yes = (keys) => Object.fromEntries(keys.map((k) => [k, 'yes']));

// Answer a state's questions the same way for every test the state has.
function answerState(code, perQuestion) {
  const out = {};
  for (const t of stateTests(code)) {
    out[t.key] = {};
    for (const q of stateQuestions(t)) out[t.key][q.id] = typeof perQuestion === 'function' ? perQuestion(q, t) : perQuestion;
  }
  return out;
}
const passAll = (q) => (q.invert ? 'no' : 'yes');

// Scenario 1: a long-term dedicated delivery driver. Full-time for one company for years, company sets routes
// and hours, drives the company van, the deliveries are what the company sells.
const DRIVER = { profit: E, investment: E, permanence: E, control: E, integral: E, skill: E };
// Scenario 2: a project-based specialist. An elevator engineer with their own firm, own equipment and many
// clients, hired once to modernize a lift at a retail store.
const SPECIALIST = { profit: C, investment: C, permanence: C, control: C, integral: C, skill: C };

test('scenario 1: long-term dedicated driver is likely employee, federally and in California', () => {
  assert.equal(federalRating(DRIVER).rating, E);
  const r = overall({ factors: DRIVER, state: 'CA', stateAnswers: answerState('CA', 'no') });
  assert.equal(r.rating, E);
});

test('scenario 2: project-based specialist is likely contractor in Texas (right-to-control test)', () => {
  assert.equal(federalRating(SPECIALIST).rating, C);
  const r = overall({ factors: SPECIALIST, state: 'TX', stateAnswers: answerState('TX', passAll) });
  assert.equal(r.rating, C);
});

test('scenario 3: a mixed picture is high risk, never a conclusion', () => {
  const r = overall({ factors: mix({ control: C, skill: C, investment: E }) });
  assert.equal(r.federal.rating, 'uncertain');
  assert.equal(r.rating, 'uncertain');
  assert.ok(r.noState);
});

test('scenario 4: passes the federal factors but fails the Massachusetts B prong, so likely employee', () => {
  // A freelance hair stylist working in the salon: the work is the salon's usual course of business.
  const ans = answerState('MA', (q) => (q.id === 'b' ? 'no' : 'yes'));
  const r = overall({ factors: SPECIALIST, state: 'MA', stateAnswers: ans });
  assert.equal(r.federal.rating, C);
  assert.equal(r.rating, E);
  assert.ok(r.states.some((s) => s.result === E && s.failed === 'b'));
});

test('scenario 5: unsure on a New Jersey prong keeps the result at high risk', () => {
  const ans = answerState('NJ', (q) => (q.id === 'c' ? 'unsure' : 'yes'));
  assert.equal(overall({ factors: SPECIALIST, state: 'NJ', stateAnswers: ans }).rating, 'uncertain');
  assert.equal(overall({ factors: SPECIALIST, state: 'NJ', stateAnswers: answerState('NJ', 'yes') }).rating, C);
});

test('scenario 6: missing the West Virginia safe harbor is high risk, not automatically employee', () => {
  const r = overall({ factors: SPECIALIST, state: 'WV', stateAnswers: answerState('WV', 'no') });
  assert.equal(r.rating, 'uncertain');
  assert.equal(overall({ factors: SPECIALIST, state: 'WV', stateAnswers: answerState('WV', 'yes') }).rating, C);
});

test('scenario 7: a regular part-time bookkeeper with three employee answers and none for contractor', () => {
  assert.equal(federalRating(mix({ permanence: E, control: E, investment: E })).rating, E);
  assert.equal(federalRating(mix({ permanence: E, control: E, investment: E, skill: C })).rating, 'uncertain');
});

test('scenario 8: right to control the manner and means points to employee in Missouri', () => {
  const r = overall({ factors: SPECIALIST, state: 'MO', stateAnswers: answerState('MO', 'yes') });
  assert.equal(r.rating, E);
});

test('the contractor threshold is cautious: five contractor answers and no employee answer', () => {
  assert.equal(federalRating(mix({ profit: C, investment: C, permanence: C, control: C, integral: C })).rating, C);
  assert.equal(federalRating(mix({ profit: C, investment: C, permanence: C, control: C })).rating, 'uncertain');
  assert.equal(federalRating({ ...SPECIALIST, skill: E }).rating, 'uncertain');
  assert.ok(federalRating({ profit: C }).error);
});

test('states with no official text confirmed fall back to the federal factors and say so', () => {
  for (const code of ['GA', 'AR', 'MS']) {
    const r = overall({ factors: SPECIALIST, state: code });
    assert.equal(r.rating, C, code);
    assert.ok(r.stateUnread, code);
  }
});

test('wage law tests are layered too: Illinois and Massachusetts ask both tests', () => {
  assert.equal(stateTests('IL').length, 2);
  assert.equal(stateTests('MA').map((t) => t.type).join(), 'abc2,abc1');
  const ans = answerState('IL', 'yes');
  ans.wage.a = 'no';
  assert.equal(overall({ factors: SPECIALIST, state: 'IL', stateAnswers: ans }).rating, E);
  assert.ok(overall({ factors: SPECIALIST, state: 'IL', stateAnswers: { ui: yes(['a', 'b', 'c']) } }).error);
});

test('ABC prongs: one-way B prong in California, two-way in Alaska', () => {
  assert.match(stateQuestions(stateTests('CA')[0])[1].q, /^Is the work outside the usual course of your business\?$/);
  assert.match(stateQuestions(stateTests('AK')[0])[1].q, /or done entirely away/);
  assert.equal(stateTestResult(stateTests('CA')[0], { a: 'yes', b: 'yes', c: 'yes' }).result, C);
});

test('all 50 states and DC, every test cited from an official source', () => {
  assert.equal(STATE_TESTS.length, 51);
  assert.equal(new Set(STATE_TESTS.map((s) => s.code)).size, 51);
  for (const s of STATE_TESTS) {
    if (!s.ui) { assert.ok(s.unread, s.code); continue; }
    for (const t of [s.ui, s.wage, ...(s.extra || [])].filter(Boolean)) {
      assert.ok(t.cite && t.text, s.code);
      assert.match(t.url, /^https:\/\/[^/]*(\.gov|\.us|nmonesource\.com|oscn\.net)\//, `${s.code}: ${t.url}`);
      assert.ok(!/justia|cornell|findlaw|nolo|casetext/i.test(t.url), s.code);
    }
    assert.ok(stateQuestions(s.ui).length > 0, `${s.code} has questions`);
  }
});

test('the page: strong disclaimer, attorney line, CTA, email capture, no network calls, no dashes', () => {
  const page = fs.readFileSync(new URL('../../src/pages/ContractorCheck.jsx', import.meta.url), 'utf8');
  const lib = fs.readFileSync(new URL('../../src/site/contractor-check.js', import.meta.url), 'utf8');
  const data = fs.readFileSync(new URL('../../src/site/contractor-states.js', import.meta.url), 'utf8');
  for (const s of [page, lib, data]) {
    assert.ok(!/[–—−]/.test(s));
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon/.test(s));
  }
  assert.match(page, /informational only and is not legal advice/);
  assert.match(page, /does not create an attorney-client relationship/);
  assert.match(page, /payroll taxes/);
  assert.match(page, /High risk, talk to an employment attorney/);
  assert.match(page, /<ToolSignup /);
  assert.match(page, /wh347-payroll-precheck/);
  assert.match(page, /FAB_URL/);
  assert.match(lib, /fab2025-1\.pdf/);
});
