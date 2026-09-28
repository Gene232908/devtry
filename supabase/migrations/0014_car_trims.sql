-- CarVibeDubai — admin-managed vehicle trims
-- Run in Supabase -> SQL Editor AFTER 0001-0013. Safe to re-run.
--
-- Makes and models already live in the database and are editable from the admin
-- catalog page. Trims did not: they were a hardcoded map in config/vehicles.ts,
-- so adding a trim meant a developer editing code and redeploying. This closes
-- that gap, giving trims the same table + admin management as models.
--
-- The seed below carries over every trim that was hardcoded, matched to its
-- model by name, so the valuation form keeps offering exactly what it does today.

create table if not exists public.car_trims (
  id            uuid primary key default gen_random_uuid(),
  model_id      uuid not null references public.car_models(id) on delete cascade,
  name          text not null,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  -- One trim name per model. Makes re-running the seed a no-op and stops an
  -- admin creating a duplicate by typing the same name twice.
  unique (model_id, name)
);

create index if not exists car_trims_model_idx on public.car_trims (model_id, display_order);

-- ---------------------------------------------------------------------------
-- Row Level Security — mirrors car_models exactly
-- ---------------------------------------------------------------------------
alter table public.car_trims enable row level security;

-- The public valuation form reads this to build its trim dropdown.
drop policy if exists car_trims_public_select on public.car_trims;
create policy car_trims_public_select on public.car_trims
  for select to anon, authenticated using (true);

drop policy if exists car_trims_staff_write on public.car_trims;
create policy car_trims_staff_write on public.car_trims
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.car_trims to service_role;

-- ---------------------------------------------------------------------------
-- Seed — every trim that was previously hardcoded in config/vehicles.ts
-- ---------------------------------------------------------------------------
-- Matched to models by name. `on conflict do nothing` keeps this idempotent and
-- means a trim an admin has since deleted is not silently resurrected on re-run.
insert into public.car_trims (model_id, name, display_order)
select m.id, t.name, t.display_order
from public.car_models m
join (
  values
    -- Rolls-Royce
    ('Phantom',        'Standard Wheelbase', 1),
    ('Phantom',        'Extended Wheelbase', 2),
    ('Ghost',          'Standard',           1),
    ('Ghost',          'Extended',           2),
    ('Ghost',          'Black Badge',        3),
    ('Cullinan',       'Standard',           1),
    ('Cullinan',       'Black Badge',        2),
    ('Wraith',         'Standard',           1),
    ('Wraith',         'Black Badge',        2),
    -- Bentley
    ('Bentayga',       'V8',                 1),
    ('Bentayga',       'S',                  2),
    ('Bentayga',       'Speed',              3),
    ('Continental GT', 'V8',                 1),
    ('Continental GT', 'S',                  2),
    ('Continental GT', 'Speed',              3),
    ('Flying Spur',    'V8',                 1),
    ('Flying Spur',    'S',                  2),
    ('Flying Spur',    'Speed',              3),
    -- Range Rover
    ('Sport SVR',      'Standard',           1),
    ('Sport SVR',      'Carbon Edition',     2),
    ('Sport',          'SE',                 1),
    ('Sport',          'HSE',                2),
    ('Sport',          'Autobiography',      3),
    ('Velar',          'S',                  1),
    ('Velar',          'R-Dynamic SE',       2),
    ('Velar',          'R-Dynamic HSE',      3),
    ('Evoque',         'S',                  1),
    ('Evoque',         'R-Dynamic S',        2),
    ('Evoque',         'R-Dynamic HSE',      3),
    -- Mercedes-Benz
    ('S-Class',        'S 450',              1),
    ('S-Class',        'S 500',              2),
    ('S-Class',        'S 580',              3),
    ('G-Class G63',    'Standard',           1),
    ('G-Class G63',    'AMG',                2),
    ('G-Class G63',    'AMG Edition',        3),
    ('E-Class',        'E 200',              1),
    ('E-Class',        'E 300',              2),
    ('E-Class',        'E 450',              3),
    ('GLE',            'GLE 350',            1),
    ('GLE',            'GLE 450',            2),
    ('GLE',            'GLE 63 AMG',         3),
    -- BMW
    ('5 Series',       '520i',               1),
    ('5 Series',       '530i',               2),
    ('5 Series',       '540i',               3),
    ('X5',             'xDrive40i',          1),
    ('X5',             'M60i',               2),
    ('3 Series',       '320i',               1),
    ('3 Series',       '330i',               2),
    ('3 Series',       'M340i',              3),
    -- Lamborghini
    ('Urus',           'Base',               1),
    ('Urus',           'Performante',        2),
    ('Huracán',        'EVO',                1),
    ('Huracán',        'Tecnica',            2),
    ('Huracán',        'STO',                3),
    ('Aventador',      'S',                  1),
    ('Aventador',      'SVJ',                2),
    ('Aventador',      'Ultimae',            3),
    -- Nissan
    ('Patrol',         'XE',                 1),
    ('Patrol',         'SE',                 2),
    ('Patrol',         'LE Platinum',        3),
    ('Altima',         'S',                  1),
    ('Altima',         'SV',                 2),
    ('Altima',         'SL',                 3),
    ('X-Trail',        'S',                  1),
    ('X-Trail',        'SV',                 2),
    ('X-Trail',        'SL',                 3)
) as t(model_name, name, display_order)
  on t.model_name = m.name
on conflict (model_id, name) do nothing;
