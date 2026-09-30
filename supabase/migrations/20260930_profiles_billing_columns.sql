-- SecondRing billing columns on public.profiles. Run in the Supabase SQL editor
-- BEFORE deploying the new webhook (it writes these columns). Safe to re-run.
alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists current_period_end timestamptz;
alter table public.profiles add column if not exists cancel_at_period_end boolean not null default false;
alter table public.profiles add column if not exists trial_ends_at timestamptz;

create index if not exists profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);
