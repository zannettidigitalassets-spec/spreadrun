// Medicare revalidation due date estimate and countdown.
// Rules read October 7, 2026:
//   42 CFR 424.515 (eCFR): a provider or supplier other than a DMEPOS supplier resubmits and recertifies its
//     enrollment every 5 years; ambulance suppliers resubmit under 410.41(c)(2); DMEPOS suppliers renew under
//     424.57(g). (a)(1) CMS contacts each provider or supplier when it is time; (a)(2) the application is due within
//     60 calendar days of that notification.
//   42 CFR 424.57(g) (eCFR): a DMEPOS supplier revalidates every 3 years after billing privileges are first granted
//     or 3 years after its last revalidation.
//   42 CFR 410.41(c)(2) (eCFR): ambulance suppliers resubmit upon the contractor's request.
//   42 CFR 424.540(a)(3), (b), (d) (eCFR): deactivation if complete information is not furnished within 90 calendar
//     days of the notice; reactivation needs recertification and CMS may require a full CMS-855; the deactivation
//     date can go back to the date of non-compliance; reactivation is effective the date the contractor received the
//     processed submission.
//   42 CFR 424.555(b) (eCFR): no payment for services furnished while billing privileges are deactivated.
//   CMS, "Revalidations (Renewing Your Enrollment)": five years in general, three for DMEPOS; due dates posted on the
//     Medicare Revalidation List seven months ahead; MACs (and the NPE DMEPOS East and West contractors for DMEPOS)
//     send a notice by email or mail about three to four months before the due date; revalidate within three months
//     of the due date even without a notice; unsolicited revalidations more than seven months early are returned;
//     no extensions and no exemptions.

export const ECFR_515 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-P/section-424.515';
export const ECFR_57 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-D/section-424.57';
export const ECFR_540 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-P/section-424.540';
export const ECFR_555 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-P/section-424.555';
export const ECFR_41 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-410/subpart-B/section-410.41';
export const CMS_REVAL = 'https://www.cms.gov/medicare/enrollment-renewal/providers-suppliers/revalidations';
export const CMS_LIST = 'https://data.cms.gov/revalidation';

export const TYPES = [
  { id: 'individual', label: 'Physician or other practitioner (CMS-855I)', years: 5, rule: '42 CFR 424.515' },
  { id: 'group', label: 'Group practice, clinic or other Part B organization (CMS-855B)', years: 5, rule: '42 CFR 424.515' },
  { id: 'institutional', label: 'Institutional provider: hospital, SNF, home health, hospice and others (CMS-855A)', years: 5, rule: '42 CFR 424.515' },
  { id: 'ambulance', label: 'Ambulance supplier (CMS-855B)', years: 5, rule: '42 CFR 424.515 and 410.41(c)(2)', ambulance: true },
  { id: 'dmepos', label: 'DMEPOS supplier (CMS-855S)', years: 3, rule: '42 CFR 424.57(g)' },
];

const DAY = 86400000;
const parse = (s) => {
  if (s instanceof Date) return Number.isNaN(s.getTime()) ? null : new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
// Months forward or back; a day the target month lacks becomes its last day (February 29 plus 3 years is February 28).
export const addMonths = (d, n) => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last)));
};
const diffDays = (a, b) => Math.round((a.getTime() - b.getTime()) / DAY);

// Today's calendar date where the user is, as a UTC midnight date.
export const localToday = (now = new Date()) => new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

// type: one of TYPES ids. baseDate: enrollment effective date or the date the last revalidation was approved.
// today: a Date or YYYY-MM-DD (defaults to the local date).
export function revalidation({ type, baseDate, today }) {
  const t = TYPES.find((x) => x.id === type);
  if (!t) return { error: 'Pick the type of provider or supplier.' };
  const base = parse(baseDate);
  if (!base) return { error: 'Enter the enrollment or last revalidation date.' };
  const now = today == null ? localToday() : parse(today);
  if (!now) return { error: 'Today\'s date could not be read.' };
  if (base > now) return { error: 'That date is in the future. Enter the date enrollment took effect or the date your last revalidation was approved.' };
  const due = addMonths(base, t.years * 12);
  const daysLeft = diffDays(due, now);
  const marks = [
    { id: 'list', date: addMonths(due, -7), label: 'CMS can post the due date on the Medicare Revalidation List (seven months ahead). Before this, an unsolicited revalidation is returned unless you have a notice.' },
    { id: 'notice', date: addMonths(due, -4), label: 'Watch for the revalidation notice from your contractor by email or mail (CMS says about three to four months before the due date).' },
    { id: 'three', date: addMonths(due, -3), label: 'Within three months of the due date: CMS says revalidate now, even if no notice came.' },
    { id: 'd90', date: addDays(due, -90), label: '90 days left.' },
    { id: 'd60', date: addDays(due, -60), label: '60 days left.' },
    { id: 'd30', date: addDays(due, -30), label: '30 days left.' },
    { id: 'due', date: due, label: 'Estimated due date.' },
  ].map((m) => ({ ...m, daysFromToday: diffDays(m.date, now), passed: m.date <= now }));
  const countdown = [90, 60, 30].map((n) => ({ days: n, date: addDays(due, -n), reached: daysLeft <= n }));
  let stage;
  if (daysLeft < 0) stage = 'overdue';
  else if (daysLeft <= 30) stage = 'd30';
  else if (daysLeft <= 60) stage = 'd60';
  else if (daysLeft <= 90) stage = 'd90';
  else if (now >= addMonths(due, -7)) stage = 'window';
  else stage = 'early';
  return { type: t, base, today: now, due, daysLeft, stage, marks, countdown };
}

export const longDate = (d) => d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
export const ymd = (d) => d.toISOString().slice(0, 10);
