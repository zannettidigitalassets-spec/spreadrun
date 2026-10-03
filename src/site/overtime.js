// Davis-Bacon / CWHSSA overtime arithmetic for the free calculator. Pure and dependency-free so it can be tested
// without a browser. Overtime is 1.5 times the basic rate; fringe is owed per hour at the straight amount
// (29 CFR 5.5(b)(1) and 5.32). Amounts are rounded to cents only for display.
export function overtime({ st, ot, rate, fringe = 0 }) {
  const stPay = st * rate;
  const otRate = rate * 1.5;
  const otPay = ot * otRate;
  const premium = ot * rate * 0.5;
  const wages = stPay + otPay;
  const fringeOwed = (st + ot) * fringe;
  return { stPay, otRate, otPay, premium, wages, fringeOwed, total: wages + fringeOwed };
}
