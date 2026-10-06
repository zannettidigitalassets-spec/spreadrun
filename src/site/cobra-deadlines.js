// COBRA deadline math for the free calculator at /tools/cobra-deadline-calculator. Pure functions, no network, so
// scripts/tests/cobra-deadlines.test.mjs can check every date. All dates are calendar dates handled in UTC.
//
// Rules (eCFR, read October 6, 2026):
//   29 CFR 2590.606-2  employer tells the administrator within 30 days of the event (or of the loss of coverage, if
//                      the plan measures from the loss of coverage)
//   29 CFR 2590.606-4  administrator sends the election notice within 14 days of being told; 44 days after the event
//                      (or loss of coverage) when the employer is the administrator
//   29 CFR 2590.606-3  divorce, legal separation or loss of dependent status: the beneficiary's reporting period
//                      cannot end before 60 days after the latest of the event, the loss of coverage, or the date
//                      they were told about the duty to report
//   26 CFR 54.4980B-6  election period ends no earlier than 60 days after the later of loss of coverage and the
//                      date the election notice is provided
//   26 CFR 54.4980B-7  maximum coverage: 18 months for termination or reduced hours (29 with a disability
//                      extension), 36 months for other events; bankruptcy runs for the retiree's life; measured from
//                      the loss of coverage only when the plan extends both the 30-day notice and the coverage period
//   26 CFR 54.4980B-8  first payment no earlier than 45 days after the election; 30-day grace for later payments

export const EVENTS = [
  { id: 'termination', label: 'Termination of employment', months: 18, notice: 'employer' },
  { id: 'hours', label: 'Reduction in hours', months: 18, notice: 'employer' },
  { id: 'death', label: 'Death of the covered employee', months: 36, notice: 'employer' },
  { id: 'divorce', label: 'Divorce or legal separation', months: 36, notice: 'beneficiary' },
  { id: 'medicare', label: 'Medicare entitlement of the covered employee', months: 36, notice: 'employer' },
  { id: 'dependent', label: 'Loss of dependent child status', months: 36, notice: 'beneficiary' },
  { id: 'bankruptcy', label: 'Employer bankruptcy', months: null, notice: 'employer' },
];
export const eventById = (id) => EVENTS.find((e) => e.id === id);

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function parseDate(s) {
  const m = DATE.exec(s || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}
export const iso = (d) => d.toISOString().slice(0, 10);
export const longDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const later = (a, b) => (a >= b ? a : b);

export function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// Calendar months. When the target month has no matching day (August 31 plus 6 months), the result is the last day
// of the target month (February 28, or 29 in a leap year). The regulations do not set a convention for this.
export function addMonths(d, n) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last)));
}

// inputs: { event, eventDate, coverageEnd (optional), administrator: 'employer' | 'separate', fromLossOfCoverage }
export function cobraDeadlines({ event, eventDate, coverageEnd = '', administrator = 'employer', fromLossOfCoverage = false }) {
  const ev = eventById(event);
  const E = parseDate(eventDate);
  if (!ev || !E) return { error: 'Pick the qualifying event and its date.' };
  const C = coverageEnd ? parseDate(coverageEnd) : E;
  if (!C) return { error: 'The coverage end date is not a valid date.' };
  if (C < E) return { error: 'Coverage ends before the qualifying event. Check both dates.' };

  // The plan may start the employer clock and the coverage period at the loss of coverage instead of the event.
  const B = fromLossOfCoverage ? later(E, C) : E;
  const steps = [];
  let noticeBy;

  if (ev.notice === 'employer') {
    if (administrator === 'employer') {
      noticeBy = addDays(B, 44);
      steps.push({ id: 'election-notice', date: noticeBy, days: 44, from: B,
        title: 'Election notice must go out',
        detail: 'The employer is also the plan administrator, so there is one combined deadline: 44 days (the 30 days an employer gets to report the event plus the 14 days an administrator gets to send the notice).',
        source: '29 CFR 2590.606-4(b)(2)' });
    } else {
      const employerBy = addDays(B, 30);
      noticeBy = addDays(employerBy, 14);
      steps.push({ id: 'employer-notice', date: employerBy, days: 30, from: B,
        title: 'Employer must notify the plan administrator',
        detail: 'The employer reports the qualifying event to the separate plan administrator within 30 days.',
        source: '29 CFR 2590.606-2' });
      steps.push({ id: 'election-notice', date: noticeBy, days: 14, from: employerBy,
        title: 'Administrator must send the election notice',
        detail: 'The administrator has 14 days from the day it is notified. The date shown assumes the employer reports on its last day; if the employer reports sooner, this deadline comes sooner too.',
        source: '29 CFR 2590.606-4(b)(1)' });
    }
  } else {
    const L = later(E, C);
    const reportBy = addDays(L, 60);
    noticeBy = addDays(reportBy, 14);
    steps.push({ id: 'beneficiary-notice', date: reportBy, days: 60, from: L,
      title: 'Qualified beneficiary must notify the plan',
      detail: 'For a divorce, legal separation or a child losing dependent status, the employer is not the one who reports. The covered employee or the qualified beneficiary must tell the plan. The plan can allow longer, but its deadline cannot end before 60 days after the later of the event and the loss of coverage (or, if later, the date the person was told about this duty).',
      source: '29 CFR 2590.606-3' });
    steps.push({ id: 'election-notice', date: noticeBy, days: 14, from: reportBy,
      title: 'Administrator must send the election notice',
      detail: 'The administrator has 14 days from the day it receives the report. The date shown assumes the report arrives on the last allowed day.',
      source: '29 CFR 2590.606-4(b)(1)' });
  }

  const electionStart = later(C, noticeBy);
  const electBy = addDays(electionStart, 60);
  steps.push({ id: 'election', date: electBy, days: 60, from: electionStart,
    title: 'Election deadline (earliest the plan can set)',
    detail: `60 days after the later of the coverage end date and the date the election notice is provided, assuming the notice goes out by its deadline. If the notice goes out earlier, the election period can end earlier, but never less than 60 days after the notice.`,
    source: '26 CFR 54.4980B-6, Q&A-1' });

  const payExample = addDays(electBy, 45);
  steps.push({ id: 'first-payment', date: payExample, days: 45, from: electBy, example: true,
    title: 'First premium payment',
    detail: 'The plan cannot require the first payment sooner than 45 days after the person elects. The election date is not known yet, so the date shown is a worked example for someone who elects on the last day of the election period.',
    source: '26 CFR 54.4980B-8, Q&A-5(b)' });

  steps.push({ id: 'grace', date: null,
    title: 'Each later monthly payment',
    detail: 'After the first payment, each payment is on time if it is made within 30 days after the first day of the period it covers, or later if the plan allows. This grace period does not apply to the first payment.',
    source: '26 CFR 54.4980B-8, Q&A-5(a)' });

  let maxEnd = null;
  const notes = [];
  if (ev.months) {
    maxEnd = addMonths(B, ev.months);
    steps.push({ id: 'max', date: maxEnd, months: ev.months, from: B,
      title: `Coverage can end at the latest (${ev.months} months)`,
      detail: `The maximum coverage period is ${ev.months} months after the ${fromLossOfCoverage && B > E ? 'loss of coverage' : 'qualifying event'}. A plan may offer more.`,
      source: '26 CFR 54.4980B-7, Q&A-4' });
    if (ev.months === 18) {
      notes.push('A qualified beneficiary who is disabled can get a disability extension to 29 months, if the conditions in 26 CFR 54.4980B-7, Q&A-5 are met.');
      notes.push('If the employee became entitled to Medicare before this event, the spouse and dependents can keep coverage until the later of 36 months after the Medicare entitlement and 18 months after this event (26 CFR 54.4980B-7, Q&A-4(d)).');
    }
  } else {
    steps.push({ id: 'max', date: null, from: B,
      title: 'Coverage can end at the latest (bankruptcy rules)',
      detail: 'For an employer bankruptcy there is no fixed number of months. The retired employee can keep coverage until death. A spouse, surviving spouse or dependent child can keep it until the earlier of their own death or 36 months after the retired employee dies.',
      source: '26 CFR 54.4980B-7, Q&A-4(e)' });
  }
  if (fromLossOfCoverage && C > E) notes.push('You said the plan measures from the loss of coverage. That applies only if the plan document says both the 30-day employer notice and the maximum coverage period start at the loss of coverage (26 CFR 54.4980B-7, Q&A-4(b)).');
  if (ev.notice === 'employer' && !fromLossOfCoverage && C > E) notes.push('Coverage ends after the event, but the notice clocks above still run from the event date unless the plan document says they start at the loss of coverage.');

  return { event: ev, eventDate: E, coverageEnd: C, base: B, noticeBy, electBy, maxEnd, steps, notes };
}
