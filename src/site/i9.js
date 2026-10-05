// Form I-9 Section 2 deadline math. 8 CFR 274a.2(b)(1)(ii) and the M-274 handbook: Section 2 is due within three
// business days of the first day of employment (start Monday, done by Thursday). Neither defines "business day";
// the default here skips weekends and federal holidays, and the caller can count days the business is open.

// Federal holidays as observed (OPM), 2026 and 2027. New Year's Day 2028 falls on a Saturday and is observed on
// Friday, December 31, 2027.
export const FEDERAL_HOLIDAYS = {
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Birthday of Martin Luther King, Jr.',
  '2026-02-16': "Washington's Birthday (Presidents Day)",
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth',
  '2026-07-03': 'Independence Day (observed)',
  '2026-09-07': 'Labor Day',
  '2026-10-12': 'Columbus Day',
  '2026-11-11': 'Veterans Day',
  '2026-11-26': 'Thanksgiving Day',
  '2026-12-25': 'Christmas Day',
  '2027-01-01': "New Year's Day",
  '2027-01-18': 'Birthday of Martin Luther King, Jr.',
  '2027-02-15': "Washington's Birthday (Presidents Day)",
  '2027-05-31': 'Memorial Day',
  '2027-06-18': 'Juneteenth (observed)',
  '2027-07-05': 'Independence Day (observed)',
  '2027-09-06': 'Labor Day',
  '2027-10-11': 'Columbus Day',
  '2027-11-11': 'Veterans Day',
  '2027-11-25': 'Thanksgiving Day',
  '2027-12-24': 'Christmas Day (observed)',
  '2027-12-31': "New Year's Day 2028 (observed)",
};
export const HOLIDAY_YEARS = [2026, 2027];

export const iso = (d) => d.toISOString().slice(0, 10);

export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return iso(d) === m[0] ? d : null;
}

// Returns { deadline, skipped: [{date, why}], counted: [dates], holidaysCovered }.
export function section2Deadline(start, { openSaturday = false, openSunday = false, openHolidays = false, shortTerm = false } = {}) {
  const startDate = typeof start === 'string' ? parseDate(start) : start;
  if (!startDate) return null;
  const holidaysCovered = HOLIDAY_YEARS.includes(startDate.getUTCFullYear());
  if (shortTerm) return { start: startDate, deadline: startDate, skipped: [], counted: [], holidaysCovered, shortTerm: true };
  const skipped = [];
  const counted = [];
  const d = new Date(startDate);
  while (counted.length < 3) {
    d.setUTCDate(d.getUTCDate() + 1);
    const key = iso(d);
    const dow = d.getUTCDay();
    if (dow === 6 && !openSaturday) skipped.push({ date: key, why: 'weekend' });
    else if (dow === 0 && !openSunday) skipped.push({ date: key, why: 'weekend' });
    else if (FEDERAL_HOLIDAYS[key] && !openHolidays) skipped.push({ date: key, why: FEDERAL_HOLIDAYS[key] });
    else counted.push(key);
  }
  return { start: startDate, deadline: new Date(d), skipped, counted, holidaysCovered, shortTerm: false };
}

export const longDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
