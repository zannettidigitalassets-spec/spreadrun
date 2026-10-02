// POST /api/retired  (reached through vercel.json rewrites only)
// One function answers 410 Gone for retired endpoints, so they cost a single slot of the 12-function Hobby limit:
//   /api/rent-estimate  the old real-estate rent estimate
//   /api/early-access   the old early-access signup list, closed 2026-10-02
// vercel.json rules can't return a 410 by themselves.
export async function POST() {
  return Response.json({ error: 'gone', message: 'This feature has been retired.' }, { status: 410 });
}
