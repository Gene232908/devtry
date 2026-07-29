-- CarVibeDubai — richer lead pipeline statuses + status tracking on partial leads
-- Run in Supabase -> SQL Editor AFTER 0001-0009. Safe to re-run.
--
-- Two new lead statuses, both of which sit between "contacted" and the end of
-- the pipeline:
--   inspected — the car has been physically seen; the meet-up happened.
--   deal      — the customer agreed to sell at the agreed price. This is the
--               win state.
-- "closed" now means the opposite outcome: the meet-up happened and no deal
-- was reached, so the car was not bought.
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent, so re-running is safe.
-- The values are added in one statement each because a new enum value cannot be
-- used in the same transaction that creates it.
alter type lead_status add value if not exists 'inspected';
alter type lead_status add value if not exists 'deal';

-- Note on 'valuation_sent': it is retired from the UI but deliberately left in
-- the enum. Postgres cannot drop an enum value, and any historical row still
-- carrying it must keep rendering rather than error.

-- ---------------------------------------------------------------------------
-- partial_leads.status — lets an admin track follow-up on abandoned forms
-- ---------------------------------------------------------------------------
-- Plain text with a CHECK rather than an enum: this list is short, unrelated to
-- the lead pipeline, and a text column avoids another type to migrate later.
alter table public.partial_leads
  add column if not exists status text not null default 'new';

do $$ begin
  alter table public.partial_leads
    add constraint partial_leads_status_check
    check (status in ('new', 'pending', 'contacted'));
exception when duplicate_object then null; end $$;
