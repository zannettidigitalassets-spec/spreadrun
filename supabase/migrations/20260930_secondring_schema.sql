-- SecondRing app schema (A3). Not yet used by the UI (which runs on mock data until Track B).
-- Subscription status already lives on public.profiles (see the billing-columns migration).
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  e164 text not null,                 -- the business's own number customers call
  twilio_number text,                 -- the SecondRing/Twilio number calls forward to (Track B)
  label text,
  forwarding_verified boolean not null default false,
  a2p_status text not null default 'not_started', -- 10DLC: not_started | pending | approved | rejected
  created_at timestamptz not null default now(),
  unique (user_id, e164)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_number_id uuid references public.phone_numbers(id) on delete set null,
  caller_e164 text not null,
  caller_name text,
  lead_tag text not null default 'new' check (lead_tag in ('new','quoted','booked','lost')),
  last_message_at timestamptz not null default now(),
  unread boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists conversations_user_last_idx on public.conversations (user_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  kind text not null default 'message' check (kind in ('message','auto_reply','missed_call')),
  body text not null,
  twilio_sid text,
  status text,                        -- queued | sent | delivered | failed
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create table if not exists public.after_hours_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_number_id uuid references public.phone_numbers(id) on delete cascade,
  enabled boolean not null default true,
  starts_at time not null default '18:00',
  ends_at time not null default '07:00',
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.business_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  auto_reply text,
  open_time time default '07:00',
  close_time time default '18:00',
  updated_at timestamptz not null default now()
);

-- Row level security: each user sees and edits only their own rows.
alter table public.phone_numbers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.after_hours_rules enable row level security;
alter table public.business_settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['phone_numbers','conversations','messages','after_hours_rules','business_settings'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- This project does not auto-grant new tables to the API roles, so grant explicitly.
-- Row level security above still limits each signed-in user to their own rows. anon gets nothing.
grant select, insert, update, delete on public.phone_numbers, public.conversations, public.messages,
  public.after_hours_rules, public.business_settings to authenticated, service_role;
