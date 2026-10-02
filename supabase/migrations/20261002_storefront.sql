-- SpreadRun API storefront (2026-10-02)
-- Prepaid credits, API keys, call log and launch measurement.
--
-- Every table has RLS on with no policies: browsers (anon/authenticated keys) cannot read or write any of it.
-- Only the server touches these tables, through the service role and the functions below.
-- This project does not auto-grant new objects to the API roles, so grants are explicit.
--
-- Money rules live here so they are atomic:
--   * balances are integer cents and can never go negative (check constraint + row lock)
--   * a completed paid call is debited exactly once (unique request_id)
--   * a Stripe Checkout session grants credits exactly once (unique stripe_session_id)

-- ---------------------------------------------------------------- tables

create table if not exists public.api_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  stripe_customer_id text,
  is_internal boolean not null default false,   -- excluded from the launch verdict (owner and test accounts)
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.api_accounts(user_id) on delete cascade,
  key_hash text not null unique,                 -- sha256 of the full key; the key itself is never stored
  key_prefix text not null,                      -- first characters, shown in the account page
  name text not null default 'Default',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_user_idx on public.api_keys (user_id);

create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.api_accounts(user_id) on delete cascade,
  delta_cents integer not null,
  reason text not null check (reason in ('purchase', 'call', 'adjustment')),
  api text,
  request_id uuid unique,
  stripe_session_id text unique,
  pack text,
  amount_paid_cents integer,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- One row per API request that reached a validator route (paid or demo). Never stores submitted data.
create table if not exists public.api_calls (
  id bigserial primary key,
  request_id uuid not null unique,
  api text not null,
  mode text not null check (mode in ('paid', 'demo')),
  outcome text not null check (outcome in ('completed', 'input_error', 'internal_error', 'insufficient_credits', 'billing_error')),
  user_id uuid references public.api_accounts(user_id) on delete set null,
  key_id uuid references public.api_keys(id) on delete set null,
  report_status text,                            -- PASS / WARN / FAIL for completed runs
  charged_cents integer not null default 0,
  duration_ms integer,
  bytes_in integer,
  ip_hash text,                                  -- demo only: salted hash, never the address
  created_at timestamptz not null default now()
);
create index if not exists api_calls_created_idx on public.api_calls (created_at);
create index if not exists api_calls_user_idx on public.api_calls (user_id, created_at desc);

create table if not exists public.storefront_events (
  id bigserial primary key,
  kind text not null check (kind in ('signup', 'credit_purchase', 'key_created', 'key_revoked')),
  user_id uuid references public.api_accounts(user_id) on delete set null,
  amount_cents integer,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists storefront_events_kind_idx on public.storefront_events (kind, created_at);

create table if not exists public.demo_usage (
  ip_hash text not null,
  api text not null,
  day date not null default current_date,
  runs integer not null default 0,
  primary key (ip_hash, api, day)
);

-- Single row. launch_at starts the 30-day verdict window; set it when the storefront goes live.
create table if not exists public.storefront_settings (
  id boolean primary key default true check (id),
  launch_at timestamptz,
  internal_emails text[] not null default '{}'
);
insert into public.storefront_settings (id) values (true) on conflict (id) do nothing;

alter table public.api_accounts enable row level security;
alter table public.api_keys enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.api_calls enable row level security;
alter table public.storefront_events enable row level security;
alter table public.demo_usage enable row level security;
alter table public.storefront_settings enable row level security;

grant select, insert, update on
  public.api_accounts, public.api_keys, public.credit_ledger, public.api_calls,
  public.storefront_events, public.demo_usage, public.storefront_settings
  to service_role;
grant usage, select on sequence public.credit_ledger_id_seq, public.api_calls_id_seq, public.storefront_events_id_seq to service_role;

-- ---------------------------------------------------------------- functions

-- Creates the account on first sign-in to /account. Logs one 'signup' event, ever, per user.
create or replace function public.ensure_account(p_user_id uuid, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_internal boolean;
  v_created boolean;
  v_acc public.api_accounts;
begin
  select coalesce(lower(p_email) = any (select lower(x) from unnest(internal_emails) x), false)
    into v_internal from public.storefront_settings;
  insert into public.api_accounts (user_id, email, is_internal)
    values (p_user_id, lower(p_email), coalesce(v_internal, false))
    on conflict (user_id) do nothing
    returning true into v_created;
  if v_created then
    insert into public.storefront_events (kind, user_id) values ('signup', p_user_id);
  end if;
  select * into v_acc from public.api_accounts where user_id = p_user_id;
  return to_jsonb(v_acc) || jsonb_build_object('created', coalesce(v_created, false));
end $$;

create or replace function public.create_api_key(p_user_id uuid, p_key_hash text, p_key_prefix text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_active integer;
  v_key public.api_keys;
begin
  select count(*) into v_active from public.api_keys where user_id = p_user_id and revoked_at is null;
  if v_active >= 10 then
    raise exception 'key_limit' using errcode = 'P0001';
  end if;
  insert into public.api_keys (user_id, key_hash, key_prefix, name)
    values (p_user_id, p_key_hash, p_key_prefix, coalesce(nullif(trim(p_name), ''), 'Default'))
    returning * into v_key;
  insert into public.storefront_events (kind, user_id) values ('key_created', p_user_id);
  return jsonb_build_object('id', v_key.id, 'prefix', v_key.key_prefix, 'name', v_key.name, 'created_at', v_key.created_at);
end $$;

create or replace function public.revoke_api_key(p_user_id uuid, p_key_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.api_keys set revoked_at = now()
    where id = p_key_id and user_id = p_user_id and revoked_at is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into public.storefront_events (kind, user_id) values ('key_revoked', p_user_id);
  end if;
  return v_n > 0;
end $$;

create or replace function public.auth_api_key(p_key_hash text)
returns table (user_id uuid, key_id uuid, balance_cents integer)
language plpgsql security definer set search_path = public as $$
begin
  update public.api_keys k set last_used_at = now()
    where k.key_hash = p_key_hash and k.revoked_at is null;
  return query
    select a.user_id, k.id, a.balance_cents
    from public.api_keys k join public.api_accounts a on a.user_id = k.user_id
    where k.key_hash = p_key_hash and k.revoked_at is null;
end $$;

-- The only place a paid call is charged. Called by charge_request() in pylib/spreadrun_api/billing.py.
create or replace function public.charge_request(
  p_user_id uuid, p_key_id uuid, p_api text, p_price_cents integer, p_request_id uuid,
  p_status text, p_duration_ms integer, p_bytes_in integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_balance integer;
begin
  if p_price_cents <= 0 then
    raise exception 'invalid_price' using errcode = 'P0001';
  end if;
  -- Idempotent: the same request is never charged twice.
  if exists (select 1 from public.credit_ledger where request_id = p_request_id) then
    select balance_cents into v_balance from public.api_accounts where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'balance_cents', v_balance, 'duplicate', true);
  end if;
  select balance_cents into v_balance from public.api_accounts where user_id = p_user_id for update;
  if v_balance is null or v_balance < p_price_cents then
    insert into public.api_calls (request_id, api, mode, outcome, user_id, key_id, report_status, duration_ms, bytes_in)
      values (p_request_id, p_api, 'paid', 'insufficient_credits', p_user_id, p_key_id, p_status, p_duration_ms, p_bytes_in)
      on conflict (request_id) do nothing;
    return jsonb_build_object('ok', false, 'reason', 'insufficient_credits', 'balance_cents', coalesce(v_balance, 0));
  end if;
  update public.api_accounts set balance_cents = balance_cents - p_price_cents
    where user_id = p_user_id returning balance_cents into v_balance;
  insert into public.credit_ledger (user_id, delta_cents, reason, api, request_id)
    values (p_user_id, -p_price_cents, 'call', p_api, p_request_id);
  insert into public.api_calls (request_id, api, mode, outcome, user_id, key_id, report_status, charged_cents, duration_ms, bytes_in)
    values (p_request_id, p_api, 'paid', 'completed', p_user_id, p_key_id, p_status, p_price_cents, p_duration_ms, p_bytes_in);
  return jsonb_build_object('ok', true, 'balance_cents', v_balance);
end $$;

-- Uncharged outcomes and demo runs. Best effort from the API side.
create or replace function public.log_api_call(
  p_request_id uuid, p_api text, p_mode text, p_outcome text, p_user_id uuid, p_key_id uuid,
  p_status text, p_duration_ms integer, p_bytes_in integer, p_ip_hash text)
returns void language sql security definer set search_path = public as $$
  insert into public.api_calls (request_id, api, mode, outcome, user_id, key_id, report_status, duration_ms, bytes_in, ip_hash)
  values (p_request_id, p_api, p_mode, p_outcome, p_user_id, p_key_id, p_status, p_duration_ms, p_bytes_in, p_ip_hash)
  on conflict (request_id) do nothing;
$$;

-- Counts every demo attempt for (ip hash, api, day). True while under the limit.
create or replace function public.demo_allow(p_ip_hash text, p_api text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_runs integer;
begin
  insert into public.demo_usage (ip_hash, api, day, runs) values (p_ip_hash, p_api, current_date, 1)
    on conflict (ip_hash, api, day) do update set runs = public.demo_usage.runs + 1
    returning runs into v_runs;
  return v_runs <= p_limit;
end $$;

-- Called by the Stripe webhook after a paid Checkout session. Exactly once per session.
create or replace function public.grant_credits(
  p_user_id uuid, p_email text, p_credit_cents integer, p_session_id text, p_pack text,
  p_amount_paid_cents integer, p_stripe_customer_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_balance integer;
begin
  if p_credit_cents <= 0 then
    raise exception 'invalid_credit' using errcode = 'P0001';
  end if;
  perform public.ensure_account(p_user_id, p_email);
  if exists (select 1 from public.credit_ledger where stripe_session_id = p_session_id) then
    select balance_cents into v_balance from public.api_accounts where user_id = p_user_id;
    return jsonb_build_object('granted', false, 'balance_cents', v_balance);
  end if;
  update public.api_accounts
    set balance_cents = balance_cents + p_credit_cents,
        stripe_customer_id = coalesce(stripe_customer_id, p_stripe_customer_id)
    where user_id = p_user_id returning balance_cents into v_balance;
  insert into public.credit_ledger (user_id, delta_cents, reason, stripe_session_id, pack, amount_paid_cents)
    values (p_user_id, p_credit_cents, 'purchase', p_session_id, p_pack, p_amount_paid_cents);
  insert into public.storefront_events (kind, user_id, amount_cents, meta)
    values ('credit_purchase', p_user_id, p_amount_paid_cents, jsonb_build_object('pack', p_pack, 'credit_cents', p_credit_cents));
  return jsonb_build_object('granted', true, 'balance_cents', v_balance);
end $$;

-- The 30-day launch verdict, computed from the logs. Internal accounts never count.
-- PASS as soon as 3+ paying users or 25+ paid runs land inside the window.
-- KILL if the window closes without either. NOT_STARTED until storefront_settings.launch_at is set
-- (before launch the counts cover all time, which is useful for checking the plumbing on a preview).
create or replace function public.storefront_metrics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_payers integer;
  v_purchases integer;
  v_revenue integer;
  v_paid_runs integer;
  v_demo_runs integer;
  v_signups integer;
  v_verdict text;
begin
  select launch_at into v_start from public.storefront_settings;
  v_end := v_start + interval '30 days';

  select count(distinct l.user_id), count(*), coalesce(sum(l.amount_paid_cents), 0)
    into v_payers, v_purchases, v_revenue
    from public.credit_ledger l join public.api_accounts a on a.user_id = l.user_id
    where l.reason = 'purchase' and not a.is_internal
      and (v_start is null or (l.created_at >= v_start and l.created_at < v_end));

  select count(*) into v_paid_runs
    from public.api_calls c join public.api_accounts a on a.user_id = c.user_id
    where c.mode = 'paid' and c.outcome = 'completed' and not a.is_internal
      and (v_start is null or (c.created_at >= v_start and c.created_at < v_end));

  select count(*) into v_demo_runs
    from public.api_calls c
    where c.mode = 'demo' and c.outcome = 'completed'
      and (v_start is null or (c.created_at >= v_start and c.created_at < v_end));

  select count(*) into v_signups
    from public.storefront_events e join public.api_accounts a on a.user_id = e.user_id
    where e.kind = 'signup' and not a.is_internal
      and (v_start is null or (e.created_at >= v_start and e.created_at < v_end));

  v_verdict := case
    when v_start is null then 'NOT_STARTED'
    when v_payers >= 3 or v_paid_runs >= 25 then 'PASS'
    when now() < v_end then 'IN_PROGRESS'
    else 'KILL'
  end;

  return jsonb_build_object(
    'verdict', v_verdict,
    'rule', 'PASS at 3+ paying users or 25+ paid runs within 30 days of launch_at; otherwise KILL when the window closes. Internal accounts excluded.',
    'window', jsonb_build_object('start', v_start, 'end', v_end,
      'daysRemaining', case when v_start is null then null else greatest(0, ceil(extract(epoch from (v_end - now())) / 86400))::int end),
    'payingUsers', v_payers,
    'paidRuns', v_paid_runs,
    'creditPurchases', v_purchases,
    'revenueCents', v_revenue,
    'demoRuns', v_demo_runs,
    'signups', v_signups,
    'targets', jsonb_build_object('payingUsers', 3, 'paidRuns', 25),
    'computedAt', now()
  );
end $$;

create or replace view public.storefront_verdict as select public.storefront_metrics() as metrics;
grant select on public.storefront_verdict to service_role;
revoke all on public.storefront_verdict from anon, authenticated;

revoke all on function public.ensure_account(uuid, text) from public, anon, authenticated;
revoke all on function public.create_api_key(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.revoke_api_key(uuid, uuid) from public, anon, authenticated;
revoke all on function public.auth_api_key(text) from public, anon, authenticated;
revoke all on function public.charge_request(uuid, uuid, text, integer, uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.log_api_call(uuid, text, text, text, uuid, uuid, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.demo_allow(text, text, integer) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, text, integer, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.storefront_metrics() from public, anon, authenticated;

grant execute on function public.ensure_account(uuid, text) to service_role;
grant execute on function public.create_api_key(uuid, text, text, text) to service_role;
grant execute on function public.revoke_api_key(uuid, uuid) to service_role;
grant execute on function public.auth_api_key(text) to service_role;
grant execute on function public.charge_request(uuid, uuid, text, integer, uuid, text, integer, integer) to service_role;
grant execute on function public.log_api_call(uuid, text, text, text, uuid, uuid, text, integer, integer, text) to service_role;
grant execute on function public.demo_allow(text, text, integer) to service_role;
grant execute on function public.grant_credits(uuid, text, integer, text, text, integer, text) to service_role;
grant execute on function public.storefront_metrics() to service_role;
