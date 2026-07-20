-- CarVibeDubai — Phase 3 addition: admin-managed vehicle catalog + lead inspection area
-- Tables: car_makes, car_models. Also adds leads.area (specific area within the emirate).
-- Run this in Supabase → SQL Editor AFTER 0001_init.sql and 0002_seed.sql.
-- Safe to re-run: uses IF NOT EXISTS / idempotent guards where practical.

-- ---------------------------------------------------------------------------
-- car_makes / car_models — admin-managed, read by the public valuation form
-- ---------------------------------------------------------------------------
create table if not exists public.car_makes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.car_models (
  id             uuid primary key default gen_random_uuid(),
  make_id        uuid not null references public.car_makes(id) on delete cascade,
  name           text not null,
  display_order  int not null default 0,
  created_at     timestamptz not null default now(),
  unique (make_id, name)
);

create index if not exists car_models_make_idx on public.car_models (make_id, display_order);

-- ---------------------------------------------------------------------------
-- leads.area — specific area within the chosen emirate (e.g. "Deira", "Al Reem Island")
-- ---------------------------------------------------------------------------
alter table public.leads add column if not exists area text;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.car_makes  enable row level security;
alter table public.car_models enable row level security;

-- Anyone can read the catalog (the public valuation form needs it, unauthenticated).
drop policy if exists car_makes_public_select on public.car_makes;
create policy car_makes_public_select on public.car_makes
  for select to anon, authenticated using (true);

drop policy if exists car_models_public_select on public.car_models;
create policy car_models_public_select on public.car_models
  for select to anon, authenticated using (true);

-- Only staff can write (writes actually happen server-side via the service key,
-- which bypasses RLS entirely — these policies are the safety net for any
-- future direct-from-browser access, matching the pattern used elsewhere).
drop policy if exists car_makes_staff_write on public.car_makes;
create policy car_makes_staff_write on public.car_makes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists car_models_staff_write on public.car_models;
create policy car_models_staff_write on public.car_models
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.car_makes  to service_role;
grant select, insert, update, delete on public.car_models to service_role;

-- ---------------------------------------------------------------------------
-- Seed with the makes/models the site already used as a static list, so the
-- switch to a database-backed catalog doesn't remove any options customers
-- currently see. Admin can add/remove from here on via /admin/catalog.
-- ---------------------------------------------------------------------------
insert into public.car_makes (name, display_order)
values
  ('Rolls-Royce', 1), ('Bentley', 2), ('Range Rover', 3), ('Mercedes-Benz', 4),
  ('Lamborghini', 5), ('Ferrari', 6), ('Porsche', 7), ('Toyota', 8), ('Nissan', 9)
on conflict (name) do nothing;

insert into public.car_models (make_id, name, display_order)
select m.id, model.name, model.ord
from public.car_makes m
join (
  values
    ('Rolls-Royce', 'Phantom', 1), ('Rolls-Royce', 'Ghost', 2), ('Rolls-Royce', 'Cullinan', 3), ('Rolls-Royce', 'Wraith', 4),
    ('Bentley', 'Bentayga', 1), ('Bentley', 'Continental GT', 2), ('Bentley', 'Flying Spur', 3),
    ('Range Rover', 'Sport SVR', 1), ('Range Rover', 'Sport', 2), ('Range Rover', 'Velar', 3), ('Range Rover', 'Evoque', 4),
    ('Mercedes-Benz', 'S-Class', 1), ('Mercedes-Benz', 'G-Class G63', 2), ('Mercedes-Benz', 'E-Class', 3), ('Mercedes-Benz', 'GLE', 4),
    ('Lamborghini', 'Urus', 1), ('Lamborghini', 'Huracán', 2), ('Lamborghini', 'Aventador', 3),
    ('Ferrari', '488', 1), ('Ferrari', 'Roma', 2), ('Ferrari', 'Portofino', 3), ('Ferrari', 'F8', 4),
    ('Porsche', 'Cayenne', 1), ('Porsche', 'Panamera', 2), ('Porsche', '911', 3),
    ('Toyota', 'Land Cruiser', 1), ('Toyota', 'Camry', 2), ('Toyota', 'Fortuner', 3),
    ('Nissan', 'Patrol', 1), ('Nissan', 'Altima', 2), ('Nissan', 'X-Trail', 3)
) as model(make_name, name, ord) on model.make_name = m.name
on conflict (make_id, name) do nothing;
