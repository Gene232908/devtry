-- Catalog safety: archival, case-insensitive uniqueness, and owner audit trail.
-- Apply after 0028. This migration is additive and does not delete catalog data.

alter table public.car_makes
  add column if not exists archived_at timestamptz;

alter table public.car_models
  add column if not exists archived_at timestamptz;

alter table public.car_trims
  add column if not exists archived_at timestamptz;

-- Existing UNIQUE constraints are case-sensitive. These indexes make the
-- business rule reliable even with concurrent tabs or different capitalization.
create unique index if not exists car_makes_active_name_ci_unique
  on public.car_makes (lower(btrim(name)))
  where archived_at is null;

create unique index if not exists car_models_active_make_name_ci_unique
  on public.car_models (make_id, lower(btrim(name)))
  where archived_at is null;

create unique index if not exists car_trims_active_model_name_ci_unique
  on public.car_trims (model_id, lower(btrim(name)))
  where archived_at is null;

create table if not exists public.catalog_activity (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('make', 'model', 'trim')),
  entity_id uuid not null,
  entity_name text not null,
  parent_name text,
  action text not null check (action in ('created', 'archived', 'restored')),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists catalog_activity_recent_idx
  on public.catalog_activity (created_at desc);

alter table public.catalog_activity enable row level security;

drop policy if exists catalog_activity_no_browser_access on public.catalog_activity;
create policy catalog_activity_no_browser_access on public.catalog_activity
  for all to authenticated using (false) with check (false);

grant select, insert on public.catalog_activity to service_role;
