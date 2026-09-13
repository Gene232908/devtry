-- Editable/auditable inspections, 24 documented photos, VIN inventory lookup,
-- and 60-day post-sale photo retention.

alter table public.inspection_photos
  add column if not exists note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.inspection_reports
  add column if not exists photos_purged_at timestamptz;

create or replace function public.record_inspection_photo_purge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_events (lead_id, actor, type, meta)
  values (
    new.lead_id,
    null,
    'inspection_photos_expired',
    jsonb_build_object('retention_days', 60, 'purged_at', new.photos_purged_at)
  );
  return new;
end;
$$;

drop trigger if exists inspection_reports_photo_purge_event on public.inspection_reports;
create trigger inspection_reports_photo_purge_event
after update of photos_purged_at on public.inspection_reports
for each row
when (old.photos_purged_at is null and new.photos_purged_at is not null)
execute function public.record_inspection_photo_purge();

create or replace function public.inspection_reports_due_for_photo_purge(
  p_cutoff timestamptz,
  p_limit integer default 20
)
returns table(report_id uuid, lead_id uuid)
language sql
security definer
set search_path = public
as $$
  select report.id, report.lead_id
  from public.inspection_reports report
  join public.inventory item on item.lead_id = report.lead_id
  where item.status = 'sold'
    and item.sold_at <= p_cutoff
    and report.photos_purged_at is null
  order by item.sold_at asc
  limit least(greatest(p_limit, 1), 20);
$$;

revoke all on function public.inspection_reports_due_for_photo_purge(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.inspection_reports_due_for_photo_purge(timestamptz, integer) to service_role;

update public.inspection_photos
set note = 'Legacy inspection photo - note was not recorded.'
where note is null or btrim(note) = '';

alter table public.inspection_photos
  alter column note set not null;

alter table public.inspection_photos
  drop constraint if exists inspection_photos_note_check;
alter table public.inspection_photos
  add constraint inspection_photos_note_check check (char_length(btrim(note)) between 1 and 600);

alter table public.inventory add column if not exists chassis_number text;

update public.inventory inventory
set chassis_number = nullif(btrim(report.report_data ->> 'chassisNumber'), '')
from public.inspection_reports report
where report.lead_id = inventory.lead_id
  and nullif(btrim(report.report_data ->> 'chassisNumber'), '') is not null
  and inventory.chassis_number is null;

create index if not exists inventory_chassis_number_lower_idx
  on public.inventory (lower(chassis_number));

create or replace function public.sync_inventory_chassis_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.inventory
  set chassis_number = nullif(btrim(new.report_data ->> 'chassisNumber'), '')
  where lead_id = new.lead_id;
  return new;
end;
$$;

drop trigger if exists inspection_report_sync_inventory_vin on public.inspection_reports;
create trigger inspection_report_sync_inventory_vin
after insert or update of report_data on public.inspection_reports
for each row execute function public.sync_inventory_chassis_number();

create or replace function public.populate_inventory_chassis_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(new.chassis_number), '') is null then
    select nullif(btrim(report_data ->> 'chassisNumber'), '') into new.chassis_number
    from public.inspection_reports where lead_id = new.lead_id;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_populate_vin on public.inventory;
create trigger inventory_populate_vin
before insert or update of lead_id on public.inventory
for each row execute function public.populate_inventory_chassis_number();

create or replace function public.save_inspection_report(
  p_lead_id uuid,
  p_report_data jsonb,
  p_actor uuid,
  p_actor_name text,
  p_actor_role text,
  p_changed_cards text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  card text;
begin
  insert into public.inspection_reports (lead_id, report_data, created_by, updated_by, updated_at)
  values (p_lead_id, p_report_data, p_actor, p_actor, now())
  on conflict (lead_id) do update set report_data=excluded.report_data, updated_by=p_actor, updated_at=now()
  returning id into saved_id;

  foreach card in array coalesce(p_changed_cards, array[]::text[]) loop
    insert into public.lead_events (lead_id, actor, type, meta)
    values (p_lead_id, p_actor, 'inspection_card_updated', jsonb_build_object(
      'actor_name', coalesce(p_actor_name,''), 'actor_role', coalesce(p_actor_role,''), 'card', card
    ));
  end loop;
  return saved_id;
end;
$$;

revoke all on function public.save_inspection_report(uuid, jsonb, uuid, text, text, text[]) from public, anon, authenticated;
grant execute on function public.save_inspection_report(uuid, jsonb, uuid, text, text, text[]) to service_role;

create or replace function public.save_inspection_photo(
  p_report_id uuid,
  p_lead_id uuid,
  p_angle text,
  p_storage_path text,
  p_content_type text,
  p_size_bytes integer,
  p_note text,
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
  action_type text;
begin
  if not exists (select 1 from public.inspection_reports where id=p_report_id and lead_id=p_lead_id) then
    raise exception 'Inspection report does not belong to this lead';
  end if;
  action_type := case when exists (
    select 1 from public.inspection_photos where inspection_report_id=p_report_id and angle=p_angle
  ) then 'inspection_photo_replaced' else 'inspection_photo_added' end;

  insert into public.inspection_photos (
    inspection_report_id, angle, storage_path, content_type, size_bytes, note, uploaded_by, updated_at
  ) values (p_report_id, p_angle, p_storage_path, p_content_type, p_size_bytes, p_note, p_actor, now())
  on conflict (inspection_report_id, angle) do update set
    storage_path=excluded.storage_path, content_type=excluded.content_type, size_bytes=excluded.size_bytes,
    note=excluded.note, uploaded_by=p_actor, updated_at=now();

  insert into public.lead_events (lead_id, actor, type, meta)
  values (p_lead_id, p_actor, action_type, jsonb_build_object(
    'actor_name', coalesce(p_actor_name,''), 'actor_role', coalesce(p_actor_role,''), 'angle', p_angle
  ));
end;
$$;

revoke all on function public.save_inspection_photo(uuid, uuid, text, text, text, integer, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.save_inspection_photo(uuid, uuid, text, text, text, integer, text, uuid, text, text) to service_role;

create or replace function public.complete_inspection_report(
  p_report_id uuid, p_lead_id uuid, p_actor uuid, p_actor_name text, p_actor_role text
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
    'Front of vehicle', 'Front bumper', 'Front left three-quarter', 'Front right three-quarter', 'Left side', 'Right side',
    'Rear of vehicle', 'Rear bumper', 'Rear left three-quarter', 'Rear right three-quarter', 'Bonnet', 'Roof',
    'Front windscreen', 'Rear windscreen', 'Driver dashboard and odometer', 'Steering wheel', 'Front seats',
    'Rear seats', 'Boot trunk', 'Engine bay', 'Driver front wheel and tyre', 'Driver rear wheel and tyre',
    'Passenger front wheel and tyre', 'Passenger rear wheel and tyre'
  ];
begin
  select lead_id, status into report_lead_id, report_status
  from public.inspection_reports where id = p_report_id for update;
  if report_lead_id is null or report_lead_id <> p_lead_id then raise exception 'Inspection report does not belong to this lead'; end if;
  if report_status <> 'draft' then raise exception 'Inspection report is already completed'; end if;
  if exists (
    select 1 from unnest(required_angles) required(angle)
    where not exists (
      select 1 from public.inspection_photos photo
      where photo.inspection_report_id = p_report_id
        and photo.angle = required.angle
        and nullif(btrim(photo.note), '') is not null
    )
  ) then raise exception 'All 24 required inspection photos and notes must be uploaded'; end if;

  update public.inspection_reports set status='completed', completed_at=now(), updated_by=p_actor, updated_at=now() where id=p_report_id;
  update public.leads set status='inspected' where id=p_lead_id and status='inspection_scheduled';
  if not found then raise exception 'Lead is no longer ready for inspection completion'; end if;
  insert into public.lead_events (lead_id, actor, type, meta) values (
    p_lead_id, p_actor, 'inspection_completed',
    jsonb_build_object('actor_name', coalesce(p_actor_name,''), 'actor_role', coalesce(p_actor_role,''))
  );
end;
$$;

revoke all on function public.complete_inspection_report(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_inspection_report(uuid, uuid, uuid, text, text) to service_role;
