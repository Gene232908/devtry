-- CarVibeDubai — Phase 1 database schema
-- Tables: profiles, leads, otp_attempts, lead_events, events, settings
-- Run this in Supabase → SQL Editor (or via the Supabase CLI).
-- Safe to re-run: uses IF NOT EXISTS / idempotent guards where practical.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type lead_status as enum ('new', 'pending', 'contacted', 'valuation_sent', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_condition as enum ('excellent', 'good', 'fair');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('admin', 'manager');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum ('page_view', 'whatsapp_click', 'otp_sent', 'lead_created');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles (admin / managers; id = auth.uid())
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'manager',
  display_name text,
  email        text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leads (valuation submissions — only inserted server-side after OTP verify)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  full_name           text not null,
  phone_e164          text not null,
  phone_verified      boolean not null default false,
  email               text,
  make                text not null,
  model               text not null,
  year                int not null check (year between 1980 and (extract(year from now())::int + 1)),
  mileage_km          int check (mileage_km >= 0),
  condition           lead_condition,
  emirate             text,
  status              lead_status not null default 'new',
  estimated_value_aed numeric,           -- ADMIN ONLY, nullable
  notes               text,              -- ADMIN ONLY
  source              text not null default 'web',
  marketing_consent   boolean not null default false,
  consent_at          timestamptz,
  is_spam             boolean not null default false,
  is_duplicate        boolean not null default false,
  assigned_to         uuid references public.profiles(id)
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_phone_idx      on public.leads (phone_e164);
create index if not exists leads_make_idx       on public.leads (make);

-- ---------------------------------------------------------------------------
-- lead_events (per-lead activity timeline / audit)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_events (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  actor      uuid references public.profiles(id),
  type       text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- otp_attempts (rate-limit + audit; Twilio holds the real code)
-- ---------------------------------------------------------------------------
create table if not exists public.otp_attempts (
  id         uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  ip         text,
  action     text not null default 'send',  -- 'send' | 'verify'
  success    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists otp_attempts_phone_idx on public.otp_attempts (phone_e164, created_at desc);
create index if not exists otp_attempts_ip_idx    on public.otp_attempts (ip, created_at desc);

-- ---------------------------------------------------------------------------
-- events (first-party analytics: visitors, whatsapp clicks)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  type       event_type not null,
  path       text,
  session_id text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_type_created_idx on public.events (type, created_at desc);
create index if not exists events_created_idx       on public.events (created_at desc);

-- ---------------------------------------------------------------------------
-- settings (single business-config row)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id               int primary key default 1 check (id = 1),
  whatsapp_number  text,
  call_number      text,
  notify_email     text,
  buy_a_car_enabled boolean not null default false,
  visible_stats    text[],
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper: is the current authenticated user staff (admin/manager)?
-- SECURITY DEFINER so the policy can read profiles without recursive RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All writes from the app happen server-side with the service/secret key,
-- which BYPASSES RLS. These policies govern the browser (anon + logged-in staff).
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.leads        enable row level security;
alter table public.lead_events  enable row level security;
alter table public.otp_attempts enable row level security;
alter table public.events       enable row level security;
alter table public.settings     enable row level security;

-- profiles: staff can read; admins manage.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- leads: anon has NO access. Staff read; staff update (no delete policy at all).
drop policy if exists leads_staff_select on public.leads;
create policy leads_staff_select on public.leads
  for select to authenticated using (public.is_staff());

drop policy if exists leads_staff_update on public.leads;
create policy leads_staff_update on public.leads
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- lead_events: staff read; inserts are server-side (service key).
drop policy if exists lead_events_staff_select on public.lead_events;
create policy lead_events_staff_select on public.lead_events
  for select to authenticated using (public.is_staff());

-- otp_attempts: staff read only; inserts server-side.
drop policy if exists otp_attempts_staff_select on public.otp_attempts;
create policy otp_attempts_staff_select on public.otp_attempts
  for select to authenticated using (public.is_staff());

-- events: staff read only; inserts server-side.
drop policy if exists events_staff_select on public.events;
create policy events_staff_select on public.events
  for select to authenticated using (public.is_staff());

-- settings: staff read; admins write.
drop policy if exists settings_staff_select on public.settings;
create policy settings_staff_select on public.settings
  for select to authenticated using (public.is_staff());

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Service key privileges
-- ---------------------------------------------------------------------------
-- Supabase's newer sb_secret_ keys authenticate as service_role but still need
-- explicit table privileges. RLS is still bypassed for service_role, while anon
-- remains locked down by the policies above.
grant select, insert, update, delete on public.leads         to service_role;
grant select, insert, update, delete on public.lead_events   to service_role;
grant select, insert, update, delete on public.otp_attempts  to service_role;
grant select, insert, update, delete on public.events        to service_role;
grant select, insert, update, delete on public.profiles      to service_role;
grant select, insert, update, delete on public.settings      to service_role;
