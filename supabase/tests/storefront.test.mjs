// Offline test of the storefront migration in an in-memory Postgres.
// Run: npm i --no-save @electric-sql/pglite@0.3 && node supabase/tests/storefront.test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth; create table auth.users(id uuid primary key);`);
await db.exec(fs.readFileSync(new URL('../migrations/20261002_storefront.sql', import.meta.url),'utf8'));
// re-run to prove idempotent
await db.exec(fs.readFileSync(new URL('../migrations/20261002_storefront.sql', import.meta.url),'utf8'));
const q = async (s, p=[]) => (await db.query(s, p)).rows;
const u1='11111111-1111-1111-1111-111111111111', u2='22222222-2222-2222-2222-222222222222', u3='33333333-3333-3333-3333-333333333333';
await q(`insert into auth.users values ($1),($2),($3)`,[u1,u2,u3]);
await q(`update storefront_settings set internal_emails='{owner@x.com}'`);
const ok=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok',m)};
let r=(await q(`select ensure_account($1,'A@x.com') r`,[u1]))[0].r; ok(r.created===true && r.balance_cents===0,'account created');
r=(await q(`select ensure_account($1,'a@x.com') r`,[u1]))[0].r; ok(r.created===false,'ensure idempotent');
r=(await q(`select ensure_account($1,'Owner@x.com') r`,[u3]))[0].r; ok(r.is_internal===true,'internal flagged');
ok((await q(`select count(*)::int n from storefront_events where kind='signup'`))[0].n===2,'one signup each');
const k=(await q(`select create_api_key($1,'h1','sr_abc','ci') r`,[u1]))[0].r; ok(!!k.id,'key created');
let a=await q(`select * from auth_api_key('h1')`); ok(a.length===1 && a[0].balance_cents===0,'auth ok');
ok((await q(`select * from auth_api_key('nope')`)).length===0,'unknown key');
r=(await q(`select charge_request($1,$2,'clinical-trial-table-validator',25,'aaaaaaaa-0000-0000-0000-000000000001','PASS',5,100) r`,[u1,k.id]))[0].r;
ok(r.ok===false && r.reason==='insufficient_credits','no credits -> refused');
r=(await q(`select grant_credits($1,'a@x.com',500,'cs_1','pack_5',500,'cus_1') r`,[u1]))[0].r; ok(r.granted && r.balance_cents===500,'grant 500');
r=(await q(`select grant_credits($1,'a@x.com',500,'cs_1','pack_5',500,'cus_1') r`,[u1]))[0].r; ok(!r.granted && r.balance_cents===500,'grant idempotent');
r=(await q(`select charge_request($1,$2,'clinical-trial-table-validator',25,'aaaaaaaa-0000-0000-0000-000000000002','FAIL',5,100) r`,[u1,k.id]))[0].r; ok(r.ok && r.balance_cents===475,'charged 25');
r=(await q(`select charge_request($1,$2,'clinical-trial-table-validator',25,'aaaaaaaa-0000-0000-0000-000000000002','FAIL',5,100) r`,[u1,k.id]))[0].r; ok(r.ok && r.duplicate && r.balance_cents===475,'charge idempotent');
for(let i=0;i<19;i++) await q(`select charge_request($1,$2,'x',25,gen_random_uuid(),'PASS',1,1)`,[u1,k.id]);
r=(await q(`select charge_request($1,$2,'x',25,gen_random_uuid(),'PASS',1,1) r`,[u1,k.id]))[0].r; ok(!r.ok && r.balance_cents===0,'20 calls per $5, 21st refused, never negative');
ok((await q(`select sum(delta_cents)::int s from credit_ledger where user_id=$1`,[u1]))[0].s===0,'ledger sums to balance');
await q(`select log_api_call(gen_random_uuid(),'x','demo','completed',null,null,'PASS',3,10,'iphash')`);
await q(`select log_api_call(gen_random_uuid(),'x','paid','input_error',$1,$2,null,null,10,null)`,[u1,k.id]);
let al=[]; for(let i=0;i<11;i++) al.push((await q(`select demo_allow('ip','x',10) r`))[0].r); ok(al.slice(0,10).every(x=>x) && al[10]===false,'demo limit 10/day');
ok((await q(`select revoke_api_key($1,$2) r`,[u1,k.id]))[0].r===true,'revoke'); ok((await q(`select * from auth_api_key('h1')`)).length===0,'revoked key rejected');
// internal purchase must not count
const k3=(await q(`select create_api_key($1,'h3','sr_x','x') r`,[u3]))[0].r;
await q(`select grant_credits($1,'owner@x.com',2000,'cs_3','pack_20',2000,null)`,[u3]);
let m=(await q(`select storefront_metrics() m`))[0].m; console.log(JSON.stringify(m));
ok(m.verdict==='NOT_STARTED' && m.payingUsers===1 && m.paidRuns===20 && m.demoRuns===1 && m.signups===1,'metrics lifetime, internal excluded');
await q(`update storefront_settings set launch_at = now() - interval '1 day'`);
m=(await q(`select metrics m from storefront_verdict`))[0].m; ok(m.verdict==='IN_PROGRESS','in progress with 1 payer, 0 runs in window? ' + m.paidRuns);
await q(`update storefront_settings set launch_at = now() - interval '40 day'`);
m=(await q(`select storefront_metrics() m`))[0].m; ok(m.verdict==='KILL','kill after window');
await q(`update storefront_settings set launch_at = now() - interval '1 day'`);
await q(`select ensure_account($1,'b@x.com')`,[u2]); await q(`select grant_credits($1,'b@x.com',500,'cs_2','pack_5',500,null)`,[u2]);
const k2=(await q(`select create_api_key($1,'h2','sr_y','y') r`,[u2]))[0].r;
for(let i=0;i<5;i++) await q(`select charge_request($1,$2,'x',25,gen_random_uuid(),'PASS',1,1)`,[u2,k2.id]);
m=(await q(`select storefront_metrics() m`))[0].m; console.log(JSON.stringify(m)); ok(m.verdict==='PASS','pass at 25 paid runs');
try { await q(`update api_accounts set balance_cents=-1 where user_id=$1`,[u1]); ok(false,'negative blocked') } catch { ok(true,'negative balance blocked by constraint') }
