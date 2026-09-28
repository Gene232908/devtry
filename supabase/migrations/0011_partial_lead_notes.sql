-- CarVibeDubai — follow-up notes on incomplete valuation forms
-- Run in Supabase -> SQL Editor AFTER 0001-0010. Safe to re-run.
--
-- Incomplete forms now open into their own detail page that mirrors the lead
-- detail screen, so they need somewhere to record what happened when someone
-- followed the person up — otherwise the only thing an admin can do with a
-- captured number is call it and remember the outcome.
alter table public.partial_leads
  add column if not exists notes text not null default '';
