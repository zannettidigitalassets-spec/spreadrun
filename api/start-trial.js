import { supabaseAdmin, requireUser } from './_lib/clients.js';

const TRIAL_DAYS = 14;

// Starts the 14-day free trial for the signed-in user (no card required). Idempotent:
// an existing trial_ends_at is never reset. Writes go through the service key because
// profiles is written server-side only.
export async function POST(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { data: existing, error } = await supabaseAdmin
    .from('profiles')
    .select('trial_ends_at, subscription_status, subscription_tier')
    .eq('email', user.email)
    .maybeSingle();
  if (error) return new Response('Could not load profile', { status: 500 });

  if (existing?.trial_ends_at) {
    return Response.json({ trial_ends_at: existing.trial_ends_at });
  }

  const trialEnds = new Date(Date.now() + TRIAL_DAYS * 86400 * 1000).toISOString();
  const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(
    {
      email: user.email,
      user_id: user.id,
      trial_ends_at: trialEnds,
      // keep existing billing fields untouched; new rows default to the free tier
      ...(existing ? {} : { subscription_status: 'none', subscription_tier: 'free' }),
    },
    { onConflict: 'email' }
  );
  if (upsertError) return new Response('Could not start trial', { status: 500 });

  return Response.json({ trial_ends_at: trialEnds });
}
