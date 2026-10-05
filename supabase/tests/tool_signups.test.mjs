// Offline test of the tool signup migration in an in-memory Postgres.
// Run: npm i --no-save @electric-sql/pglite@0.3 && node supabase/tests/tool_signups.test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;`);
const sql = fs.readFileSync(new URL('../migrations/20261005_tool_signups.sql', import.meta.url), 'utf8');
await db.exec(sql);
await db.exec(sql); // idempotent
const q = async (s, p = []) => (await db.query(s, p)).rows;
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };

ok((await q(`select tool_signup('A@Example.com ', '/tools/pbj-preflight-checks') r`))[0].r === true, 'new address');
ok((await q(`select tool_signup('a@example.com', '/tools/i9-section2-deadline-calculator') r`))[0].r === false, 'repeat is not new');
let rows = await q(`select email, source, unsubscribed from tool_signups`);
ok(rows.length === 1 && rows[0].email === 'a@example.com' && rows[0].source === '/tools/i9-section2-deadline-calculator', 'one row, source updated, lower-cased');
await q(`select tool_unsubscribe(' A@EXAMPLE.COM')`);
ok((await q(`select unsubscribed from tool_signups`))[0].unsubscribed === true, 'unsubscribed');
await q(`select tool_unsubscribe('nobody@example.com')`);
ok((await q(`select count(*)::int n from tool_signups`))[0].n === 1, 'unknown address changes nothing');
await q(`select tool_signup('b@example.com', '/tools/pbj-preflight-checks')`);
const c = (await q(`select tool_signup_counts() c`))[0].c;
ok(c['/tools/pbj-preflight-checks'].subscribed === 1 && c['/tools/i9-section2-deadline-calculator'].unsubscribed === 1, 'counts by source, no addresses');
ok(!JSON.stringify(c).includes('@'), 'counts carry no address');
await q(`select tool_signup('a@example.com', '/tools/pbj-preflight-checks')`);
ok((await q(`select unsubscribed from tool_signups where email='a@example.com'`))[0].unsubscribed === false, 'asking again resubscribes');
for (const [e, s, m] of [['not-an-email', '/tools/x', 'bad email'], ['c@example.com', 'https://evil.example', 'bad source'], [`${'x'.repeat(250)}@example.com`, '/tools/x', 'too long']]) {
  try { await q(`select tool_signup($1, $2)`, [e, s]); ok(false, m); } catch { ok(true, `${m} rejected`); }
}
