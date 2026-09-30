import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';

const DAY = 86400 * 1000;
const RETENTION_DAYS = 30;

// Single source of truth for "what can this signed-in user do right now".
//   state: 'loading' | 'subscribed' | 'past_due' | 'trial' | 'expired'
// Subscription status/tier come from public.profiles (written only by the Stripe webhook);
// the trial is started server-side by /api/start-trial. Every feature gate in the app
// reads this hook, so the Stripe entitlement wiring lives in exactly one place.
export function computeEntitlement(profile, now = Date.now()) {
  const tier = profile?.subscription_tier;
  const status = profile?.subscription_status;
  const isPlan = tier === 'solo' || tier === 'shop';
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : null;

  if (isPlan && status === 'active') return { state: 'subscribed', tier };
  if (isPlan && status === 'past_due') return { state: 'past_due', tier };
  if (trialEnds && trialEnds > now) {
    return { state: 'trial', tier: 'trial', daysLeft: Math.max(1, Math.ceil((trialEnds - now) / DAY)), trialEnds };
  }
  if (trialEnds) {
    const retainedUntil = trialEnds + RETENTION_DAYS * DAY;
    return { state: 'expired', tier: 'none', trialEnds, retainedUntil, dataRetained: retainedUntil > now };
  }
  return { state: 'loading', tier: 'none' };
}

// Feature flags per plan. The trial is the full product (Shop features included) per the brief.
export const FEATURES = {
  afterHoursRules: (e) => e.state === 'trial' || e.tier === 'shop',
  maxNumbers: (e) => (e.tier === 'shop' || e.state === 'trial' ? 3 : 1),
  monthlyTexts: (e) => (e.tier === 'shop' ? 1000 : 300),
  canUseApp: (e) => e.state === 'trial' || e.state === 'subscribed' || e.state === 'past_due',
};

export function useEntitlement(user) {
  const [profile, setProfile] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, trial_ends_at')
      .eq('email', user.email)
      .maybeSingle();
    if (err) { setError(err.message); setProfile(null); return; }

    // First visit: start the 14-day trial server-side, then use its end date.
    if (!data?.trial_ends_at && !(data?.subscription_tier === 'solo' || data?.subscription_tier === 'shop')) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const res = await fetch('/api/start-trial', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sess?.session?.access_token}` },
        });
        if (res.ok) {
          const { trial_ends_at } = await res.json();
          setProfile({ ...(data ?? {}), trial_ends_at });
          return;
        }
      } catch (e) { setError(String(e)); }
    }
    setProfile(data ?? null);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const entitlement = profile === undefined ? { state: 'loading', tier: 'none' } : computeEntitlement(profile);
  return { ...entitlement, error, reload: load };
}
