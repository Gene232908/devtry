-- Audit trail for admin follow-up on incomplete valuation captures.
create table if not exists public.partial_lead_events (
  id              uuid primary key default gen_random_uuid(),
  partial_lead_id  uuid not null references public.partial_leads(id) on delete cascade,
  type            text not null check (type in ('note_updated', 'status_changed')),
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists partial_lead_events_recent_idx
  on public.partial_lead_events (partial_lead_id, created_at desc);

alter table public.partial_lead_events enable row level security;
revoke all on public.partial_lead_events from anon, authenticated;
grant select, insert on public.partial_lead_events to service_role;

create or replace function public.update_partial_lead_follow_up(
  p_id uuid,
  p_status text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.partial_leads%rowtype;
begin
  if p_status not in ('new', 'pending', 'contacted', 'inspected', 'deal', 'closed') then
    raise exception 'Invalid partial lead status';
  end if;

  select * into old_row
  from public.partial_leads
  where id = p_id and converted_lead_id is null
  for update;

  if not found then raise exception 'Incomplete form not found'; end if;

  update public.partial_leads
  set status = p_status, notes = p_notes, updated_at = now()
  where id = p_id;

  if old_row.notes is distinct from p_notes then
    insert into public.partial_lead_events (partial_lead_id, type, meta)
    values (p_id, 'note_updated', jsonb_build_object('from', coalesce(old_row.notes, ''), 'to', p_notes));
  end if;

  if old_row.status is distinct from p_status then
    insert into public.partial_lead_events (partial_lead_id, type, meta)
    values (p_id, 'status_changed', jsonb_build_object('from', old_row.status, 'to', p_status));
  end if;
end;
$$;

grant execute on function public.update_partial_lead_follow_up(uuid, text, text) to service_role;
