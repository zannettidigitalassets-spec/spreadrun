-- Optional email signups from the free tools: deadline reminders and new-tool alerts.
-- Stores only the address, the tool page it came from, when, and whether it unsubscribed. Nothing is sent from here:
-- sending is a separate build. Every function is security definer and callable only by the service role (the API).
-- Idempotent: safe to run more than once.

create table if not exists public.tool_signups (
  id bigserial primary key,
  email text not null check (length(email) <= 254 and email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  source text not null check (source ~ '^/tools/[a-z0-9-]{1,100}$'),
  created_at timestamptz not null default now(),
  unsubscribed boolean not null default false
);
create unique index if not exists tool_signups_email_key on public.tool_signups (email);

alter table public.tool_signups enable row level security;
revoke all on public.tool_signups from public, anon, authenticated;
grant select, insert, update on public.tool_signups to service_role;
grant usage, select on sequence public.tool_signups_id_seq to service_role;

-- Sign up, or sign up again: one row per address. A repeat signup updates the source and, because the person just
-- asked again, clears an earlier unsubscribe. Returns true for a new address.
create or replace function public.tool_signup(p_email text, p_source text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_new boolean;
begin
  insert into public.tool_signups (email, source) values (lower(trim(p_email)), p_source)
    on conflict (email) do update set source = excluded.source, unsubscribed = false
    returning (xmax = 0) into v_new;
  return v_new;
end $$;

-- Unsubscribe. Says nothing about whether the address was on the list.
create or replace function public.tool_unsubscribe(p_email text)
returns void language sql security definer set search_path = public as $$
  update public.tool_signups set unsubscribed = true where email = lower(trim(p_email));
$$;

-- Counts by source for the owner's metrics. No addresses.
create or replace function public.tool_signup_counts()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(source, jsonb_build_object('subscribed', subscribed, 'unsubscribed', unsubscribed)), '{}'::jsonb)
  from (
    select source,
           count(*) filter (where not unsubscribed)::int as subscribed,
           count(*) filter (where unsubscribed)::int as unsubscribed
    from public.tool_signups group by source
  ) s;
$$;

revoke all on function public.tool_signup(text, text) from public, anon, authenticated;
revoke all on function public.tool_unsubscribe(text) from public, anon, authenticated;
revoke all on function public.tool_signup_counts() from public, anon, authenticated;
grant execute on function public.tool_signup(text, text) to service_role;
grant execute on function public.tool_unsubscribe(text) to service_role;
grant execute on function public.tool_signup_counts() to service_role;
