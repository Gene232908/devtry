-- CarVibeDubai - arrival tracking, catalog specifications, and purchaser inspection reports.
--
-- This migration is additive. It keeps the existing lead status workflow intact:
-- Arrival is a separate operational fact, and a purchaser report is required
-- before the application moves a lead to Inspected.

create table if not exists public.vehicle_specifications (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 2 and 80),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.vehicle_specifications enable row level security;

drop policy if exists vehicle_specifications_public_select on public.vehicle_specifications;
create policy vehicle_specifications_public_select on public.vehicle_specifications
  for select using (true);

grant select, insert, update, delete on public.vehicle_specifications to service_role;

alter table public.leads
  add column if not exists specification text,
  add column if not exists arrival_status text not null default 'not_arrived',
  add column if not exists arrived_at timestamptz,
  add column if not exists arrived_by uuid references public.profiles(id) on delete set null;

alter table public.leads
  drop constraint if exists leads_arrival_status_check;

alter table public.leads
  add constraint leads_arrival_status_check
  check (arrival_status in ('not_arrived', 'arrived'));

create index if not exists leads_purchaser_arrival_idx
  on public.leads (purchaser_id, arrival_status, inspection_scheduled_at desc);

-- An abandoned form can later become a real lead. Keep this catalog-backed
-- value through that recovery path as well, instead of silently dropping it.
alter table public.partial_leads
  add column if not exists specification text;

drop function if exists public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, uuid
);
drop function if exists public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid
);

create function public.capture_partial_lead(
  p_phone          text,
  p_full_name      text,
  p_furthest_step  int,
  p_consent        boolean,
  p_trigger        text,
  p_ip_hash        text default null,
  p_make           text default null,
  p_model          text default null,
  p_year           int  default null,
  p_mileage_km     int  default null,
  p_specification  text default null,
  p_description    text default null,
  p_call_center_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.partial_leads as partial (
    phone_e164, full_name, consent, furthest_step, last_trigger, request_ip_hash,
    make, model, year, mileage_km, specification, description, call_center_id
  )
  values (
    p_phone, nullif(btrim(p_full_name), ''), coalesce(p_consent, false),
    greatest(coalesce(p_furthest_step, 1), 1), p_trigger, p_ip_hash,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), p_year, p_mileage_km,
    nullif(btrim(p_specification), ''), nullif(btrim(p_description), ''), p_call_center_id
  )
  on conflict (phone_e164) do update set
    full_name       = coalesce(excluded.full_name, partial.full_name),
    consent         = excluded.consent,
    furthest_step   = greatest(partial.furthest_step, excluded.furthest_step),
    last_trigger    = excluded.last_trigger,
    request_ip_hash = coalesce(excluded.request_ip_hash, partial.request_ip_hash),
    make            = coalesce(excluded.make, partial.make),
    model           = coalesce(excluded.model, partial.model),
    year            = coalesce(excluded.year, partial.year),
    mileage_km      = coalesce(excluded.mileage_km, partial.mileage_km),
    specification   = coalesce(excluded.specification, partial.specification),
    description     = coalesce(excluded.description, partial.description),
    call_center_id  = coalesce(partial.call_center_id, excluded.call_center_id),
    updated_at      = now()
  where partial.converted_lead_id is null;
end;
$$;

revoke all on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid
) to service_role;

create table if not exists public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  report_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspection_reports_lead_status_idx
  on public.inspection_reports (lead_id, status);

create table if not exists public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_report_id uuid not null references public.inspection_reports(id) on delete cascade,
  angle text not null check (char_length(btrim(angle)) between 2 and 80),
  storage_path text not null unique,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 8388608),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (inspection_report_id, angle)
);

create index if not exists inspection_photos_report_idx
  on public.inspection_photos (inspection_report_id, angle);

-- The report, the lead status, and its audit entry must transition together.
-- Calling this through service_role from the server avoids a completed report
-- being left behind if changing the lead status fails.
create or replace function public.complete_inspection_report(
  p_report_id uuid,
  p_lead_id uuid,
  p_actor uuid,
  p_actor_name text,
  p_actor_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_lead_id uuid;
  report_status text;
  required_angles text[] := array[
    'Front of vehicle', 'Front left three-quarter', 'Front right three-quarter', 'Left side', 'Right side',
    'Rear of vehicle', 'Rear left three-quarter', 'Rear right three-quarter', 'Bonnet', 'Roof',
    'Front windscreen', 'Rear windscreen', 'Driver dashboard and odometer', 'Steering wheel', 'Front seats',
    'Rear seats', 'Boot trunk', 'Engine bay', 'Driver front wheel and tyre', 'Driver rear wheel and tyre',
    'Passenger front wheel and tyre', 'Passenger rear wheel and tyre'
  ];
begin
  select lead_id, status into report_lead_id, report_status
  from public.inspection_reports
  where id = p_report_id
  for update;

  if report_lead_id is null or report_lead_id <> p_lead_id then
    raise exception 'Inspection report does not belong to this lead';
  end if;
  if report_status <> 'draft' then
    raise exception 'Inspection report is already completed';
  end if;
  if exists (
    select 1 from unnest(required_angles) as required(angle)
    where not exists (
      select 1 from public.inspection_photos photo
      where photo.inspection_report_id = p_report_id and photo.angle = required.angle
    )
  ) then
    raise exception 'All required inspection photos must be uploaded';
  end if;

  update public.inspection_reports
  set status = 'completed', completed_at = now(), updated_by = p_actor, updated_at = now()
  where id = p_report_id;

  update public.leads
  set status = 'inspected'
  where id = p_lead_id and status = 'inspection_scheduled';
  if not found then
    raise exception 'Lead is no longer ready for inspection completion';
  end if;

  insert into public.lead_events (lead_id, actor, type, meta)
  values (p_lead_id, p_actor, 'inspection_completed', jsonb_build_object(
    'actor_name', coalesce(p_actor_name, ''),
    'actor_role', coalesce(p_actor_role, '')
  ));
end;
$$;

revoke all on function public.complete_inspection_report(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_inspection_report(uuid, uuid, uuid, text, text) to service_role;

alter table public.inspection_reports enable row level security;
alter table public.inspection_photos enable row level security;

grant select, insert, update, delete on public.inspection_reports to service_role;
grant select, insert, update, delete on public.inspection_photos to service_role;

-- Uploads are proxied through authenticated Next.js routes. The private bucket
-- deliberately has no browser policy, so vehicle photos and report data never
-- become public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
