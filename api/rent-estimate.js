// Disabled in the SecondRing retool (2026-09-30). This endpoint belonged to the hidden
// real-estate analyzer, trusted a client-supplied userId, and spent RentCast quota.
// Left as a stub so old clients get a clear answer; remove with the dormant code post-launch.
export async function POST() {
  return Response.json({ error: 'gone', message: 'This feature has been retired.' }, { status: 410 });
}
