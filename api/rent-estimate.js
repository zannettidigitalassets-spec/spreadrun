// This file lives at /api/rent-estimate.js and Vercel automatically turns it into
// a live serverless endpoint at https://spreadrun.com/api/rent-estimate
//
// It proxies requests to the RentCast API so the API key never touches the client.
// Enforces a 3 lookups/month cap per user, tracked in Supabase.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://deqchbqeajwrwdfwzxuc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const MONTHLY_LOOKUP_LIMIT = 3;

export async function POST(request) {
  try {
    const { address, userId } = await request.json();

    if (!address || !userId) {
      return Response.json({ error: 'Missing address or userId' }, { status: 400 });
    }

    // Determine current month key, e.g. "2026-07"
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check the user's current usage for this month
    const { data: usageRow, error: usageError } = await supabaseAdmin
      .from('rent_lookups')
      .select('count')
      .eq('user_id', userId)
      .eq('month', monthKey)
      .maybeSingle();

    if (usageError) {
      console.error('Failed to check rent lookup usage:', usageError.message);
      return Response.json({ error: 'Failed to check usage' }, { status: 500 });
    }

    const currentCount = usageRow?.count ?? 0;

    if (currentCount >= MONTHLY_LOOKUP_LIMIT) {
      return Response.json(
        { error: 'limit_reached', message: `You've used your ${MONTHLY_LOOKUP_LIMIT} free lookups this month.` },
        { status: 429 }
      );
    }

    // Call RentCast's rent estimate (AVM) endpoint
    const rentcastRes = await fetch(
      `https://api.rentcast.io/v1/avm/rent/long-term?address=${encodeURIComponent(address)}`,
      {
        headers: {
          'X-Api-Key': process.env.RENTCAST_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!rentcastRes.ok) {
      const errText = await rentcastRes.text();
      console.error('RentCast API error:', rentcastRes.status, errText);
      return Response.json(
        { error: 'lookup_failed', message: 'Could not find rent data for that address.' },
        { status: 502 }
      );
    }

    const rentData = await rentcastRes.json();

    // Increment usage count — upsert handles both first lookup of the month and subsequent ones
    const { error: upsertError } = await supabaseAdmin
      .from('rent_lookups')
      .upsert(
        {
          user_id: userId,
          month: monthKey,
          count: currentCount + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,month' }
      );

    if (upsertError) {
      console.error('Failed to update rent lookup usage:', upsertError.message);
      // Don't block the response over a logging failure — the lookup already succeeded
    }

    return Response.json({
      rent: rentData.rent,
      rentRangeLow: rentData.rentRangeLow,
      rentRangeHigh: rentData.rentRangeHigh,
      lookupsUsed: currentCount + 1,
      lookupsRemaining: MONTHLY_LOOKUP_LIMIT - (currentCount + 1),
    });
  } catch (err) {
    console.error('Error processing rent estimate request:', err);
    return new Response('Internal error processing rent estimate', { status: 500 });
  }
}
