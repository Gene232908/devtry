-- CarVibeDubai — Phase 5: WhatsApp Cloud API OTP verification
-- Replaces the Twilio Verify-based OTP flow with a self-hosted, Supabase-backed
-- OTP record so we control expiry, attempt limits, and resend cooldown directly
-- instead of relying on a third party's own verification state.
-- Run this in Supabase -> SQL Editor AFTER 0001-0006. Safe to re-run.

create table if not exists public.whatsapp_otp_verifications (
  id                        uuid primary key default gen_random_uuid(),
  phone_number              text not null,              -- E.164, e.g. +9715XXXXXXXX or +63XXXXXXXXXX (test mode)
  otp_hash                  text not null,               -- HMAC-SHA256(code, OTP_HASH_SECRET) — never the plain code
  expires_at                timestamptz not null,
  attempt_count             int not null default 0,
  max_attempts              int not null default 5,
  verified_at               timestamptz,
  used_at                   timestamptz,                 -- set once consumed by a successful /api/leads submission
  created_at                timestamptz not null default now(),
  last_sent_at              timestamptz not null default now(),
  request_ip_hash           text,                        -- sha256(ip), never the raw IP
  verification_session_id   uuid not null default gen_random_uuid(), -- bound into the client-side proof
  valuation_submission_id   uuid references public.leads(id) on delete set null
);

create index if not exists whatsapp_otp_phone_created_idx
  on public.whatsapp_otp_verifications (phone_number, created_at desc);

create index if not exists whatsapp_otp_session_idx
  on public.whatsapp_otp_verifications (verification_session_id);

create index if not exists whatsapp_otp_expires_idx
  on public.whatsapp_otp_verifications (expires_at);

-- ---------------------------------------------------------------------------
-- Row Level Security — deny-by-default. No policies are defined for anon or
-- authenticated roles, so RLS blocks both entirely; only the service-role key
-- (used exclusively by trusted server-side API routes) can read/write this
-- table, since service_role bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.whatsapp_otp_verifications enable row level security;

grant select, insert, update, delete on public.whatsapp_otp_verifications to service_role;

-- ---------------------------------------------------------------------------
-- Cleanup helper: safe to call periodically (e.g. a scheduled Supabase cron
-- job or manual maintenance) to delete long-expired, unverified records.
-- Keeps verified/used records for a short audit window (7 days) before purge.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_expired_whatsapp_otps()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.whatsapp_otp_verifications
  where expires_at < now() - interval '7 days';
$$;
