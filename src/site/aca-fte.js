// ACA full-time-equivalent and applicable large employer (ALE) math.
// Rules read October 7, 2026:
//   26 CFR 54.4980H-2(b)(1), (b)(2), (c) on eCFR: FTEs per month = hours of non-full-time employees (capped at
//     120 per employee) / 120, fractions kept (may round to the hundredth); annual figure = (sum of monthly
//     full-time employees + sum of monthly FTEs) / 12, rounded down; ALE at 50 or more; seasonal worker exception.
//   IRS, "Determining if an employer is an applicable large employer": full-time = 30 hours a week on average or
//     130 hours in a month; Examples 1 and 2 (47.5 rounds to 47, not an ALE; 50 is an ALE).
//   26 CFR 301.6056-1(g): statements due January 31 with an automatic 30-day extension.
//   IRS Instructions for Forms 1094-C and 1095-C (2025): file by February 28 on paper or March 31 electronically;
//     weekend or legal holiday moves a due date to the next business day; e-file if 10 or more returns in aggregate.

export const ECFR_ALE = 'https://www.ecfr.gov/current/title-26/chapter-I/subchapter-D/part-54/section-54.4980H-2';
export const ECFR_6056 = 'https://www.ecfr.gov/current/title-26/chapter-I/subchapter-F/part-301/subpart-ZZ/section-301.6056-1';
export const IRS_ALE = 'https://www.irs.gov/affordable-care-act/employers/determining-if-an-employer-is-an-applicable-large-employer';
export const IRS_ESRP = 'https://www.irs.gov/affordable-care-act/employers/employer-shared-responsibility-provisions';
export const IRS_INSTR = 'https://www.irs.gov/instructions/i109495c';

export const FTE_DIVISOR = 120;
export const ALE_THRESHOLD = 50;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const round2 = (n) => Math.round(n * 100) / 100;

// months: 12 entries of { fullTime, partTimeHours }. seasonal: the employees above 50 in the months over 50
// were seasonal workers.
export function aleStatus({ months, seasonal = false }) {
  if (!Array.isArray(months) || months.length !== 12) return { error: 'Enter all 12 months.' };
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const ft = num(months[i].fullTime);
    const hrs = num(months[i].partTimeHours);
    if (ft === null || hrs === null) return { error: `Enter both numbers for ${MONTHS[i]}.` };
    if (Number.isNaN(ft) || Number.isNaN(hrs) || !Number.isInteger(ft)) return { error: `Check the numbers for ${MONTHS[i]}: full-time employees must be a whole number and hours cannot be negative.` };
    const fte = hrs / FTE_DIVISOR;
    rows.push({ month: MONTHS[i], fullTime: ft, partTimeHours: hrs, fte, fteRounded: round2(fte), total: ft + fte });
  }
  const sumFt = rows.reduce((a, r) => a + r.fullTime, 0);
  const sumFte = rows.reduce((a, r) => a + r.fte, 0);
  const average = (sumFt + sumFte) / 12;
  const count = Math.floor(average + 1e-9);
  const monthsOver = rows.filter((r) => r.total > ALE_THRESHOLD).length;
  const exceptionAvailable = count >= ALE_THRESHOLD && monthsOver <= 4;
  const seasonalApplies = exceptionAvailable && seasonal;
  const ale = count >= ALE_THRESHOLD && !seasonalApplies;
  return { rows, sumFt, sumFte, average, count, monthsOver, exceptionAvailable, seasonalApplies, ale };
}

// Same numbers every month.
export const sameEveryMonth = (fullTime, partTimeHours) => Array.from({ length: 12 }, () => ({ fullTime, partTimeHours }));

const nextBusinessDay = (d) => {
  let x = d;
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) x = new Date(x.getTime() + 86400000);
  return x;
};
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

// Reporting for coverage year Y is due in year Y + 1. Weekends move a date forward; legal holidays also do,
// which this does not check (no federal holiday falls on these dates in the years offered).
export function reportingDeadlines(coverageYear) {
  const y = coverageYear + 1;
  const jan31 = utc(y, 1, 31);
  return {
    coverageYear,
    furnish: nextBusinessDay(new Date(jan31.getTime() + 30 * 86400000)),
    paper: nextBusinessDay(utc(y, 2, 28)),
    electronic: nextBusinessDay(utc(y, 3, 31)),
  };
}

export const longDate = (d) => d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
