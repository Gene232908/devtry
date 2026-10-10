-- Migration 0044: Scrap Inquiry Inspection 10 Items
-- Update complete_inspection_report function to require only the approved 10 photo items when inquiry_type = 'scrap',
-- while maintaining the full 24 photo requirement for standard valuation inspections.

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
  lead_inquiry text;
  required_angles text[];
begin
  select lead_id, status into report_lead_id, report_status
  from public.inspection_reports where id = p_report_id for update;
  if report_lead_id is null or report_lead_id <> p_lead_id then raise exception 'Inspection report does not belong to this lead'; end if;
  if report_status <> 'draft' then raise exception 'Inspection report is already completed'; end if;

  select inquiry_type into lead_inquiry from public.leads where id = p_lead_id;

  if lead_inquiry = 'scrap' then
    required_angles := array[
      'Front of vehicle',
      'Left side',
      'Right side',
      'Rear of vehicle',
      'Bonnet',
      'Roof',
      'Driver dashboard and odometer',
      'Front seats',
      'Rear seats',
      'Engine bay'
    ];
  else
    required_angles := array[
      'Front of vehicle', 'Front bumper', 'Front left three-quarter', 'Front right three-quarter', 'Left side', 'Right side',
      'Rear of vehicle', 'Rear bumper', 'Rear left three-quarter', 'Rear right three-quarter', 'Bonnet', 'Roof',
      'Front windscreen', 'Rear windscreen', 'Driver dashboard and odometer', 'Steering wheel', 'Front seats',
      'Rear seats', 'Boot trunk', 'Engine bay', 'Driver front wheel and tyre', 'Driver rear wheel and tyre',
      'Passenger front wheel and tyre', 'Passenger rear wheel and tyre'
    ];
  end if;

  if exists (
    select 1 from unnest(required_angles) required(angle)
    where not exists (
      select 1 from public.inspection_photos photo
      where photo.inspection_report_id = p_report_id
        and photo.angle = required.angle
    )
  ) then
    if lead_inquiry = 'scrap' then
      raise exception 'All 10 required scrap inspection photos must be uploaded';
    else
      raise exception 'All 24 required inspection photos must be uploaded';
    end if;
  end if;

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
