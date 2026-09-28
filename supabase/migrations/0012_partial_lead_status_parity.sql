-- CarVibeDubai — bring incomplete-form statuses in line with the lead pipeline
-- Run in Supabase -> SQL Editor AFTER 0001-0011. Safe to re-run.
--
-- Incomplete forms now open into a detail page that mirrors Customer Details,
-- so they use the same follow-up vocabulary: an abandoned form can still be
-- contacted, the car still inspected, and it can still end in a deal or in no
-- sale. Keeping two different status lists made the two screens read as if they
-- described different processes when they do not.
--
-- 'new' stays permitted because it remains the default a fresh capture is
-- written with; it simply is not selectable once someone opens the record.
alter table public.partial_leads
  drop constraint if exists partial_leads_status_check;

alter table public.partial_leads
  add constraint partial_leads_status_check
  check (status in ('new', 'pending', 'contacted', 'inspected', 'deal', 'closed'));
