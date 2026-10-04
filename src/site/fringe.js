// Davis-Bacon fringe benefit annualization (29 CFR 5.25(c)(1)): divide the cost of the benefit by every hour worked,
// private and Davis-Bacon, in the period the cost covers. Cash paid in lieu of fringe counts toward the obligation
// (29 CFR 5.31). Pure and dependency-free so it can be tested without a browser.
export function annualize({ annualCost, totalHours, cashPerHour = 0, requiredRate = null }) {
  const credit = annualCost / totalHours;
  const provided = credit + cashPerHour;
  const out = { credit, cashPerHour, provided };
  if (requiredRate !== null) {
    out.requiredRate = requiredRate;
    out.difference = provided - requiredRate;   // positive: surplus, negative: shortfall
    // A shortfall is rounded up to the next cent so paying it in cash always covers it.
    out.shortfall = out.difference < 0 ? Math.ceil(-out.difference * 100 - 1e-9) / 100 : 0;
  }
  return out;
}
