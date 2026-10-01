-- SecondRing early-access list. Written only by /api/early-access with the service key.
-- RLS is on with no policies, so the anon/authenticated keys cannot read or write it.
create table if not exists public.early_access (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);
create unique index if not exists early_access_email_key on public.early_access (lower(email));
alter table public.early_access enable row level security;
