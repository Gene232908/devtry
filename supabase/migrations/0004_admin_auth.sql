-- CarVibeDubai — Phase 3: admin auth (Supabase Auth + forced first-login password reset)
-- Run this in Supabase → SQL Editor (or via the Supabase CLI).
-- Safe to re-run: idempotent guards.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;
