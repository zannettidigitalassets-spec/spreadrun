// Two single-rule PBJ checks for the free pre-flight page. Pure and dependency-free so they can be tested without
// a browser. Sources: CMS Nursing Home Five-Star Technical Users' Guide (September 2026), staffing scoring exceptions;
// CMS PBJ Policy Manual v2.8 (August 2026), section 2 (time conversion and meal break policy).

// Five-Star: four or more days in the quarter with no RN hours (job codes 5-7) on days with one or more residents
// means a one-star staffing rating for the quarter.
export const ZERO_RN_DAY_LIMIT = 4;

// Accepts one value per line, comma or semicolon separated values, or "date,hours" lines (a header row is skipped).
// Returns { days: [{ label, hours }], errors: [line numbers] }.
export function parseDailyHours(text) {
  const days = [];
  const errors = [];
  const lines = String(text || '').split(/\r?\n/);
  const pairs = lines.some((l) => /^\s*[^,;\s]+\s*[,;]\s*[^,;]+\s*$/.test(l) && /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(l));
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    if (pairs) {
      const [label, value] = t.split(/[,;]/).map((s) => s.trim());
      if (value === undefined || value === '') { errors.push(i + 1); return; }
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        if (i === 0 && Number.isNaN(n)) return;               // a header row such as date,hours
        errors.push(i + 1);
        return;
      }
      days.push({ label, hours: n });
    } else {
      for (const part of t.split(/[,;\s]+/).filter(Boolean)) {
        const n = Number(part);
        if (!Number.isFinite(n) || n < 0) errors.push(i + 1);
        else days.push({ label: `Day ${days.length + 1}`, hours: n });
      }
    }
  });
  return { days, errors: [...new Set(errors)] };
}

export function zeroRnDays(days) {
  const zero = days.filter((d) => d.hours === 0);
  return { total: days.length, zeroDays: zero, count: zero.length, oneStar: zero.length >= ZERO_RN_DAY_LIMIT };
}

// CMS conversion of minutes to tenths of an hour: 1 to 6 minutes = 0.1, 7 to 12 = 0.2, ... 55 to 60 = 1.0.
export const toCmsTenths = (minutes) => Math.ceil(Math.round(minutes) / 6) / 10;
// The optional alternative: nearest hundredth.
export const toHundredths = (minutes) => Math.round((minutes / 60) * 100) / 100;

// Meal break policy: for each full shift, deduct at least 30 minutes whether or not the break was taken, or the
// actual break if it was longer. Unpaid break time is already out of paid time, so only the rest is deducted.
export function mealBreak({ paidMinutes, breakPaid, breakMinutes = 30, shifts = 1 }) {
  const perShift = Math.max(30, breakMinutes);
  const alreadyUnpaid = breakPaid ? 0 : breakMinutes;
  const deductPerShift = Math.max(0, perShift - alreadyUnpaid);
  const deducted = deductPerShift * shifts;
  const reportMinutes = Math.max(0, paidMinutes - deducted);
  return { perShift, alreadyUnpaid, deductPerShift, deducted, reportMinutes,
    tenths: toCmsTenths(reportMinutes), hundredths: toHundredths(reportMinutes) };
}
