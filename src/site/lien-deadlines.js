// Mechanics lien deadline math. Every rule lives in lien-states.js with its citation and official URL.
//
// Rule kinds:
//   days     n calendar days after the start date
//   months   n months after the start date (plus plusDays); a missing day becomes the month's last day
//   bdays    n business days (Monday to Friday) after the start date
//   monthDay the given day of the Nth month after the month of the start date (Texas style);
//            with each:true it applies to every month furnished, so both the first and last month are shown
//   monthEndDays n days after the last day of the month of the start date; each:true as above
//   beforeLien n days before the lien deadline (a notice of intent that must precede the filing)
//   none     not required; na  not available for this role; text  no date can be computed
// Start points (from): first, last (furnishing dates), lien (the lien filing date you enter, or the lien
// deadline if you leave it blank), lienDue (always the lien deadline), claim / claimFirst (the public claim
// notice date or deadline; claimFirst uses the first month when claims are due monthly).
import { LIEN_STATES } from './lien-states.js';

export { LIEN_STATES };
export const PROJECT_TYPES = [
  { id: 'com', label: 'Private commercial' },
  { id: 'res', label: 'Private residential' },
  { id: 'pub', label: 'Public works (state or local)' },
];
export const ROLES = [
  { id: 'gc', label: 'General contractor (hired by the owner)' },
  { id: 'sub', label: 'Subcontractor' },
  { id: 'sup', label: 'Supplier' },
];
export const ATTORNEY = 'Confirm with a construction attorney in this state.';

const DAY = 86400000;
export const parseDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? dt : null;
};
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
export function addMonths(d, n) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last)));
}
export function addBusinessDays(d, n) {
  let x = d;
  let left = n;
  while (left > 0) {
    x = addDays(x, 1);
    const wd = x.getUTCDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return x;
}
const monthDay = (d, months, day) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, day));
const monthEnd = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
export const longDate = (d) => d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export const stateByCode = (code) => LIEN_STATES.find((s) => s.code === code);

// Pick the rule for one step, applying the residential overrides.
export function pickRule(st, type, role, step) {
  if (type === 'pub') return step === 'suit' ? st.pub.suit : st.pub[step === 'lien' ? 'claim' : step][role];
  if (step === 'suit') return st.priv.suit;
  const base = st.priv[step][role];
  if (type === 'res' && st.res && st.res[step] && st.res[step][role]) return st.res[step][role];
  return base;
}

// Compute one rule. ctx holds first, last and the resolved anchor dates.
export function applyRule(rule, ctx) {
  const out = { kind: rule.k, text: rule.t, cite: rule.cite || '', url: rule.url || '', flag: rule.flag || '' };
  const start = (from) => ({ first: ctx.first, last: ctx.last, lien: ctx.lien, lienDue: ctx.lienDue, claim: ctx.claim, claimFirst: ctx.claimFirst })[from || 'last'];
  switch (rule.k) {
    case 'days': out.date = addDays(start(rule.from), rule.n); break;
    case 'months': out.date = addDays(addMonths(start(rule.from), rule.n), rule.plusDays || 0); break;
    case 'bdays': out.date = addBusinessDays(start(rule.from), rule.n); break;
    case 'monthDay':
      if (rule.each) {
        out.date = monthDay(ctx.first, rule.months, rule.day);
        out.lastDate = monthDay(ctx.last, rule.months, rule.day);
      } else out.date = monthDay(start(rule.from), rule.months, rule.day);
      break;
    case 'monthEndDays':
      if (rule.each) {
        out.date = addDays(monthEnd(ctx.first), rule.n);
        out.lastDate = addDays(monthEnd(ctx.last), rule.n);
      } else out.date = addDays(monthEnd(start(rule.from)), rule.n);
      break;
    case 'beforeLien': out.date = addDays(ctx.lienDue, -rule.n); break;
    default: break;
  }
  if (out.date && rule.k === 'days' && rule.n === 0 && rule.from === 'first') out.before = true;
  return out;
}

// The latest date a dated result covers (for 'each' rules, the last month's date).
const latest = (r) => r.lastDate || r.date || null;

export function lienDeadlines({ state, type, role, first, last, lienDate, claimDate }) {
  const st = stateByCode(state);
  if (!st) return { error: 'Pick a state.' };
  if (!PROJECT_TYPES.some((t) => t.id === type)) return { error: 'Pick the project type.' };
  if (!ROLES.some((r) => r.id === role)) return { error: 'Pick your role.' };
  const f = parseDate(first);
  const l = parseDate(last);
  if (!f || !l) return { error: 'Enter the first and last dates you furnished labor or materials.' };
  if (l < f) return { error: 'The last furnishing date cannot be before the first.' };
  if (st.unread) return { state: st, unread: st.unread };
  if (type === 'pub' && role === 'gc') {
    const na = { kind: 'na', text: 'Not applicable: the payment bond protects people who work for the prime contractor. The prime contractor\'s own claim is against the public owner under its contract.', cite: '', url: '', flag: '' };
    return { state: st, type, role, notice: na, lien: na, suit: na, notes: [] };
  }
  const ctx = { first: f, last: l };
  const notice = applyRule(pickRule(st, type, role, 'notice'), { ...ctx, lienDue: l });
  const lienRule = pickRule(st, type, role, 'lien');
  const lien = applyRule(lienRule, { ...ctx });
  const due = latest(lien);
  ctx.lienDue = due;
  ctx.claimFirst = lien.date || null;
  if (notice.kind === 'beforeLien') Object.assign(notice, applyRule(pickRule(st, type, role, 'notice'), ctx));
  const entered = type === 'pub' ? parseDate(claimDate) : parseDate(lienDate);
  ctx.lien = entered || due;
  ctx.claim = entered || due;
  const suitRule = pickRule(st, type, role, 'suit');
  const suit = applyRule(suitRule, ctx);
  if (['lien', 'claim'].includes(suitRule.from) && !entered && suit.date) suit.assumed = true;
  if (['lien', 'claim', 'claimFirst', 'lienDue'].includes(suitRule.from) && !due) suit.date = null;
  if (type === 'res' && st.res?.lienFlag?.[role]) lien.flag = [lien.flag, st.res.lienFlag[role]].filter(Boolean).join(' ');
  return { state: st, type, role, notice, lien, suit, notes: st.notes || [] };
}
