-- CarVibeDubai — partial (abandoned) valuation capture + phone blocklist
-- Run in Supabase -> SQL Editor AFTER 0001-0008. Safe to re-run.
--
-- WHY partial_leads is separate from leads:
--   leads rows are OTP-verified submissions and drive the real pipeline. These
--   are unverified, half-finished forms, so they must never be mixed in — a
--   partial row has no proof the phone belongs to the person who typed it.
--
-- HOW duplicates are prevented:
--   phone_e164 is UNIQUE and every write goes through capture_partial_lead()
--   below, which is a single atomic INSERT ... ON CONFLICT. There is no
--   read-then-write anywhere in the path, so two simultaneous captures for the
--   same number cannot both insert. This also keeps the whole capture to one
--   round trip, which matters because it fires on ordinary UI actions.

-- ---------------------------------------------------------------------------
-- partial_leads — a valuation form that was started but never submitted
-- ---------------------------------------------------------------------------
-- Deliberately no CHECK constraints on year/mileage: this table holds abandoned,
-- half-typed input. A constraint violation here would surface as a 500 on a
-- routine UI action, so the columns stay permissive and the admin UI presents
-- whatever was captured.
create table if not exists public.partial_leads (
  id                uuid primary key default gen_random_uuid(),
  phone_e164        text not null unique,          -- normalized; the dedupe key
  full_name         text,
  consent           boolean not null default false,
  furthest_step     int not null default 1,        -- 1 = contact, 2 = car details, 3 = trim/location
  last_trigger      text,                          -- 'close' | 'consent' | 'next' — what captured it
  request_ip_hash   text,                          -- sha256(ip); the raw IP is never stored

  -- Step 2 fields, present only when the customer got that far.
  make              text,
  model             text,
  year              int,
  mileage_km        int,
  description       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Set once this person completes the real form. Non-null rows are hidden from
  -- the admin list, so a customer can never appear as both a lead and a partial.
  converted_lead_id uuid references public.leads(id) on delete set null,
  converted_at      timestamptz
);

-- Admin list: newest-first over unconverted rows only. Partial index keeps it
-- small and means the list query never scans converted history.
create index if not exists partial_leads_open_idx
  on public.partial_leads (created_at desc)
  where converted_lead_id is null;

-- ---------------------------------------------------------------------------
-- capture_partial_lead — the ONLY write path for partial_leads
-- ---------------------------------------------------------------------------
-- Atomic upsert keyed on phone_e164. Merge rules:
--   * furthest_step only ever moves forward (greatest), so going Back in the
--     form never downgrades what we already know.
--   * every optional field uses coalesce(excluded, existing), so a later
--     capture with fewer fields can never blank out earlier data.
--   * the WHERE on DO UPDATE makes converted rows immutable: once someone has
--     submitted a real lead, a late/in-flight capture cannot resurrect them
--     into the incomplete list.
create or replace function public.capture_partial_lead(
  p_phone         text,
  p_full_name     text,
  p_furthest_step int,
  p_consent       boolean,
  p_trigger       text,
  p_ip_hash       text default null,
  p_make          text default null,
  p_model         text default null,
  p_year          int  default null,
  p_mileage_km    int  default null,
  p_description   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.partial_leads as pl (
    phone_e164, full_name, consent, furthest_step, last_trigger, request_ip_hash,
    make, model, year, mileage_km, description
  )
  values (
    p_phone, nullif(btrim(p_full_name), ''), coalesce(p_consent, false),
    greatest(coalesce(p_furthest_step, 1), 1), p_trigger, p_ip_hash,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), p_year, p_mileage_km,
    nullif(btrim(p_description), '')
  )
  on conflict (phone_e164) do update set
    full_name       = coalesce(excluded.full_name, pl.full_name),
    consent         = excluded.consent,
    furthest_step   = greatest(pl.furthest_step, excluded.furthest_step),
    last_trigger    = excluded.last_trigger,
    request_ip_hash = coalesce(excluded.request_ip_hash, pl.request_ip_hash),
    make            = coalesce(excluded.make, pl.make),
    model           = coalesce(excluded.model, pl.model),
    year            = coalesce(excluded.year, pl.year),
    mileage_km      = coalesce(excluded.mileage_km, pl.mileage_km),
    description     = coalesce(excluded.description, pl.description),
    updated_at      = now()
  where pl.converted_lead_id is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_partial_lead_converted — called after a real lead is inserted
-- ---------------------------------------------------------------------------
-- Idempotent and safe to call when no partial row exists (the common case for a
-- customer who completed the form in one go).
create or replace function public.mark_partial_lead_converted(
  p_phone   text,
  p_lead_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.partial_leads
  set converted_lead_id = p_lead_id,
      converted_at      = now(),
      updated_at        = now()
  where phone_e164 = p_phone
    and converted_lead_id is null;
$$;

-- ---------------------------------------------------------------------------
-- blocked_numbers — hard blocklist, checked before any WhatsApp send
-- ---------------------------------------------------------------------------
-- A number here is refused at the top of /api/otp/send, before the Meta call,
-- so a blocked spammer costs exactly nothing. Kept as one table with a reason
-- column rather than separate manual/automatic lists: the send path needs a
-- single lookup, and the admin sees one place to answer "is this number
-- blocked?".
create table if not exists public.blocked_numbers (
  phone_e164     text primary key,
  reason         text not null default 'manual_spam',   -- 'manual_spam' | 'otp_abuse'
  note           text,
  full_name      text,                                   -- copied at block time for admin context
  source_lead_id uuid references public.leads(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists blocked_numbers_created_idx on public.blocked_numbers (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.partial_leads   enable row level security;
alter table public.blocked_numbers enable row level security;

-- anon/authenticated get no write path at all; all writes are service-role only
-- (public capture goes through the API route, never the browser).
drop policy if exists partial_leads_staff_select on public.partial_leads;
create policy partial_leads_staff_select on public.partial_leads
  for select to authenticated using (public.is_staff());

drop policy if exists blocked_numbers_staff_select on public.blocked_numbers;
create policy blocked_numbers_staff_select on public.blocked_numbers
  for select to authenticated using (public.is_staff());

grant select, insert, update, delete on public.partial_leads   to service_role;
grant select, insert, update, delete on public.blocked_numbers to service_role;

grant execute on function public.capture_partial_lead(text, text, int, boolean, text, text, text, text, int, int, text) to service_role;
grant execute on function public.mark_partial_lead_converted(text, uuid) to service_role;
