-- CarVibeDubai — Phase 4: valuation form field alignment
-- Adds columns for the current public valuation form (Trim, Describe Your Car,
-- and the Basic/Mid/Full Option picker that replaced the old excellent/good/fair
-- condition field). Backward-compatible only: does not touch or drop the legacy
-- `condition` column, in case any historical rows still use it.
-- Run this in Supabase -> SQL Editor AFTER 0001-0005. Safe to re-run.

do $$ begin
  create type lead_option_level as enum ('Basic Mode', 'Mid Mode', 'Full Option');
exception when duplicate_object then null; end $$;

alter table public.leads add column if not exists trim text;
alter table public.leads add column if not exists description text;
alter table public.leads add column if not exists option_level lead_option_level;

comment on column public.leads.trim is 'Vehicle trim/spec level selected on the valuation form (e.g. "520i", "GXR").';
comment on column public.leads.description is 'Free-text "describe your car" field from the valuation form. Optional, max 400 chars (enforced at the API layer).';
comment on column public.leads.option_level is 'Basic Mode / Mid Mode / Full Option picker. Replaces the legacy excellent/good/fair `condition` column for new submissions; `condition` is kept for historical rows only.';

-- ---------------------------------------------------------------------------
-- Catalog addition: BMW was added to the static make/model list after the
-- vehicle_catalog migration (0003) was written. Add it the same way so the
-- database-backed catalog stays in sync with what the public form offers.
-- ---------------------------------------------------------------------------
insert into public.car_makes (name, display_order)
values ('BMW', 5)
on conflict (name) do nothing;

insert into public.car_models (make_id, name, display_order)
select m.id, model.name, model.ord
from public.car_makes m
join (
  values
    ('BMW', '5 Series', 1), ('BMW', 'X5', 2), ('BMW', '3 Series', 3)
) as model(make_name, name, ord) on model.make_name = m.name
on conflict (make_id, name) do nothing;
