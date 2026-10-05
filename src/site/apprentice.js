// Davis-Bacon apprentice ratio check (29 CFR 5.5(a)(4)(i)): on the job site, in each craft classification, the ratio
// of apprentices to journeyworkers must not be greater than the ratio the contractor's registered program allows.
// The ratio is whatever the user enters from their own program; nothing here supplies one. Pure, no dependencies.

// "1:3", "1 to 3", "1/3" -> { apprentices: 1, journeyworkers: 3 }, or null.
export function parseRatio(text) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(?::|to|\/)\s*(\d+(?:\.\d+)?)\s*$/i.exec(String(text || ''));
  if (!m) return null;
  const a = Number(m[1]);
  const j = Number(m[2]);
  return a > 0 && j > 0 ? { apprentices: a, journeyworkers: j } : null;
}

// Most apprentices allowed with this many journeyworkers. Integer math on the cross product avoids rounding drift.
export const allowedApprentices = (journeyworkers, r) =>
  Math.floor((journeyworkers * r.apprentices) / r.journeyworkers + 1e-9);

const count = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

// crafts: [{ name, ratio: '1:3', registration: '...', days: [{ label, apprentices, journeyworkers }] }]
export function checkCrafts(crafts) {
  const breaches = [];
  const missingRegistration = [];
  const problems = [];
  let checkedDays = 0;
  crafts.forEach((c, ci) => {
    const name = String(c.name || '').trim() || `Classification ${ci + 1}`;
    const ratio = parseRatio(c.ratio);
    const days = (c.days || []).map((d) => ({ label: d.label, apprentices: count(d.apprentices), journeyworkers: count(d.journeyworkers) }));
    if (days.some((d) => Number.isNaN(d.apprentices) || Number.isNaN(d.journeyworkers))) {
      problems.push({ craft: name, kind: 'count' });
      return;
    }
    const withApprentices = days.filter((d) => d.apprentices > 0);
    if (!withApprentices.length) return;
    if (!String(c.registration || '').trim()) missingRegistration.push({ craft: name });
    if (!ratio) {
      problems.push({ craft: name, kind: 'ratio' });
      return;
    }
    for (const d of withApprentices) {
      checkedDays += 1;
      const allowed = allowedApprentices(d.journeyworkers, ratio);
      if (d.apprentices > allowed) {
        breaches.push({ craft: name, day: d.label, apprentices: d.apprentices, journeyworkers: d.journeyworkers,
          ratio: `${ratio.apprentices}:${ratio.journeyworkers}`, allowed, over: d.apprentices - allowed });
      }
    }
  });
  return { breaches, missingRegistration, problems, checkedDays, ok: !breaches.length && !missingRegistration.length && !problems.length };
}
