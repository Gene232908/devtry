-- Migration 0043: Allow optional inspection photo notes unless defects/damage are reported

-- 1. Remove strict NOT NULL and minimum 1-char length constraint from inspection_photos.note
alter table public.inspection_photos
  alter column note drop not null;

alter table public.inspection_photos
  alter column note set default '';

alter table public.inspection_photos
  drop constraint if exists inspection_photos_note_check;

alter table public.inspection_photos
  add constraint inspection_photos_note_check check (note is null or char_length(btrim(note)) <= 600);

-- 2. Update complete_inspection_report function to require all 24 photos without forcing non-empty notes
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
    )
  ) then raise exception 'All 24 required inspection photos must be uploaded'; end if;

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
