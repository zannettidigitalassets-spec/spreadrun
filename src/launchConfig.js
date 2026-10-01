// One switch for the pre-launch state. Flip TRIAL_LIVE to true at launch:
// trial CTAs, the pricing line, the Sign in button and the meta description all switch back.
// index.html reads these values at build time (see vite.config.js).
export const TRIAL_LIVE = false;

const BASE = "SecondRing texts every missed caller back in under 60 seconds from your own business number, so the job stays yours.";

export const SITE_TITLE = "SecondRing: Missed-Call Text-Back for Contractors";
export const META_DESCRIPTION = TRIAL_LIVE
  ? `${BASE} 14-day free trial.`
  : `${BASE} Launching soon. Join the early access list.`;
