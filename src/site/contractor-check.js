// Contractor vs employee risk check. The six federal factors come from 29 CFR 795.110 (the 2024 rule),
// read on eCFR in October 2026. State tests live in contractor-states.js with their citations.
// Nothing here is a legal conclusion: every output is a risk rating.
import { STATE_TESTS } from './contractor-states.js';

export { STATE_TESTS };
export const E = 'employee';
export const N = 'mixed';
export const C = 'contractor';

export const RULE_URL = 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-B/part-795';
export const FAB_URL = 'https://www.dol.gov/sites/dolgov/files/WHD/fab/fab2025-1.pdf';
export const NPRM_URL = 'https://www.dol.gov/agencies/whd/flsa/misclassification/2026rulemaking';

// Each factor: the plain-language question and three answers, ordered employee, mixed, contractor.
export const FACTORS = [
  {
    id: 'profit',
    name: 'Opportunity for profit or loss',
    cite: '29 CFR 795.110(b)(1)',
    question: 'How does this worker make more money from the work?',
    answers: [
      [E, 'Only by working more hours or getting a higher rate from you.'],
      [N, 'They can turn down jobs or negotiate some pricing, but mostly they earn what you set.'],
      [C, 'They set their own prices, market themselves, hire help or invest, and can lose money on a job.'],
    ],
  },
  {
    id: 'investment',
    name: 'Investments by the worker',
    cite: '29 CFR 795.110(b)(2)',
    question: 'What does the worker invest in their own business?',
    answers: [
      [E, 'Little or nothing beyond ordinary tools. You supply what matters to get the work done.'],
      [N, 'Their own tools or vehicle, but nothing close to a business investment.'],
      [C, 'Real business capital: equipment, a shop or office, insurance, advertising.'],
    ],
  },
  {
    id: 'permanence',
    name: 'Permanence of the relationship',
    cite: '29 CFR 795.110(b)(3)',
    question: 'How long has this lasted, and do they work for anyone else?',
    answers: [
      [E, 'Ongoing with no end date, and they work only or mostly for you.'],
      [N, 'Recurring but on and off, or they have a few other clients.'],
      [C, 'A defined project or occasional jobs, and they work for many clients.'],
    ],
  },
  {
    id: 'control',
    name: 'Nature and degree of control',
    cite: '29 CFR 795.110(b)(4)',
    question: 'Who decides how, when and where the work gets done?',
    answers: [
      [E, 'You do. You set the schedule, supervise the work, set the price they charge, or limit their other work.'],
      [N, 'You set deadlines and quality standards; they choose their own methods and hours.'],
      [C, 'They do. You only check the finished result.'],
    ],
  },
  {
    id: 'integral',
    name: 'Work integral to your business',
    cite: '29 CFR 795.110(b)(5)',
    question: 'How central is this work to what your business does?',
    answers: [
      [E, 'It is the core of what we sell, like a driver for a delivery company.'],
      [N, 'It supports the business but is not what we sell.'],
      [C, 'It is outside our line of business, like a plumber fixing a pipe at a software company.'],
    ],
  },
  {
    id: 'skill',
    name: 'Skill and initiative',
    cite: '29 CFR 795.110(b)(6)',
    question: 'Does the worker bring specialized skills and use them like a business?',
    answers: [
      [E, 'No special skills, or skills we trained them in.'],
      [N, 'Skilled, but they use those skills the way an employee would.'],
      [C, 'Specialized skills, used with business initiative such as bidding and finding customers.'],
    ],
  },
];

export const FACTOR_LABEL = { [E]: 'Points to employee', [N]: 'Mixed', [C]: 'Points to contractor' };

// Overall federal rating from the six answers. The rule weighs the totality of the circumstances with no
// set formula, so this leans cautious: a contractor rating needs at least five contractor answers and none
// pointing to employee.
export function federalRating(answers) {
  const vals = FACTORS.map((f) => answers[f.id]);
  if (vals.some((v) => ![E, N, C].includes(v))) return { error: 'Answer all six questions first.' };
  const e = vals.filter((v) => v === E).length;
  const c = vals.filter((v) => v === C).length;
  let rating;
  if (e >= 4 || (e >= 3 && c === 0)) rating = E;
  else if (c >= 5 && e === 0) rating = C;
  else rating = 'uncertain';
  return { rating, employee: e, contractor: c, mixed: 6 - e - c };
}

// The questions a state's test adds, by test type. Each answers 'yes', 'unsure' or 'no'.
// strict: a 'no' means the test treats the worker as an employee.
const A = { id: 'a', q: 'Is the worker free from your control and direction over how the work is done, both in the contract and in practice?' };
const B1 = { id: 'b', q: 'Is the work outside the usual course of your business?' };
const B2 = { id: 'b', q: 'Is the work outside the usual course of your business, or done entirely away from all of your places of business?' };
const CP = { id: 'c', q: 'Is the worker customarily engaged in their own independently established trade or business doing this kind of work, with other customers?' };
const CTRL = { id: 'ctrl', q: 'Does your business keep the right to control how the work is done, not just the end result?', invert: true };
const ALL = { id: 'all', q: 'Does the worker meet every condition listed for this test?' };
const IRS = { id: 'irs', q: 'Taken together, do the IRS factors (behavioral control, financial control and the relationship) point to the worker running their own business?' };

export function stateQuestions(test) {
  if (!test) return [];
  switch (test.type) {
    case 'abc1': return [A, B1, CP];
    case 'abc2': return [A, B2, CP];
    case 'two': return [A, CP];
    case 'control':
    case 'common': return [CTRL];
    case 'irs20': return [IRS];
    case 'checklist':
    case 'maine':
    case 'oregon':
    case 'wisconsin':
    case 'certificate': return [ALL];
    case 'safeharbor': return [{ ...ALL, safeHarbor: true }];
    default: return [];
  }
}

export const TYPE_NAME = {
  abc1: 'ABC test',
  abc2: 'ABC test (B prong can be met two ways)',
  two: 'Two-part test: control and independent business',
  control: 'Right-to-control test',
  common: 'Common-law test',
  irs20: 'IRS 20-factor test',
  checklist: 'Checklist test',
  maine: 'Control plus checklist test',
  oregon: 'Control plus independent business checklist',
  wisconsin: 'Control plus 6 of 9 conditions',
  certificate: 'Exemption certificate test',
  safeharbor: 'Safe harbor: contractor if every condition is met',
};

export const stateByCode = (code) => STATE_TESTS.find((s) => s.code === code);

// The state tests that take questions: the unemployment test, plus the wage law test when it differs.
export function stateTests(code) {
  const st = stateByCode(code);
  if (!st || !st.ui) return [];
  const out = [{ key: 'ui', label: 'Unemployment insurance', ...st.ui }];
  if (st.wage) out.push({ key: 'wage', label: 'Wage and hour law', ...st.wage });
  return out;
}

// Result of one state test from its answers: 'employee', 'contractor' or 'uncertain'.
export function stateTestResult(test, answers = {}) {
  const qs = stateQuestions(test);
  if (!qs.length) return null;
  let anyUnsure = false;
  for (const q of qs) {
    const a = answers[q.id];
    if (!['yes', 'no', 'unsure'].includes(a)) return { result: null, incomplete: true };
    const meets = q.invert ? a === 'no' : a === 'yes';
    const fails = q.invert ? a === 'yes' : a === 'no';
    if (a === 'unsure') anyUnsure = true;
    else if (fails) return { result: q.safeHarbor ? 'uncertain' : E, failed: q.id };
    else if (!meets) anyUnsure = true;
  }
  return { result: anyUnsure ? 'uncertain' : C };
}

// Combine the federal rating and the state results into one overall rating.
export function overall({ factors, state, stateAnswers = {} }) {
  const fed = federalRating(factors);
  if (fed.error) return fed;
  const tests = state ? stateTests(state) : [];
  const results = [];
  for (const t of tests) {
    const r = stateTestResult(t, stateAnswers[t.key]);
    if (r && r.incomplete) return { error: `Answer the ${stateByCode(state).name} questions first.` };
    if (r) results.push({ key: t.key, label: t.label, ...r });
  }
  let rating;
  if (fed.rating === E || results.some((r) => r.result === E)) rating = E;
  else if (fed.rating === C && results.every((r) => r.result === C)) rating = C;
  else rating = 'uncertain';
  const st = state ? stateByCode(state) : null;
  return {
    rating,
    federal: fed,
    states: results,
    stateUnread: st && !st.ui ? st.unread : null,
    noState: !state,
  };
}

export const RATING = {
  [E]: { title: 'Likely employee', tone: 'fail' },
  uncertain: { title: 'High risk, uncertain', tone: 'warn' },
  [C]: { title: 'Likely contractor', tone: 'pass' },
};
