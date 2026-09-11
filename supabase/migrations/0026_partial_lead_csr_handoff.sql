-- CarVibeDubai — incomplete-form CSR recovery and verified handoff workflow.
--
-- An incomplete form is not a real lead. It belongs to a Call Centre agent for
-- recovery first. Once the agent confirms the missing details and books an
-- inspection, the application converts it into a real lead and assigns the
-- Purchaser through the normal lead workflow.

-- Keep the stored vocabulary compatible with the lead pipeline. The UI only
-- offers stages that make sense before conversion; this constraint preserves
-- historical records and keeps the server allowlist in sync with leads.
alter table public.partial_leads
  drop constraint if exists partial_leads_status_check;

alter table public.partial_leads
  add constraint partial_leads_status_check
  check (status in (
    'new', 'pending', 'contacted', 'inspection_scheduled',
    'inspected', 'negotiating', 'deal', 'closed'
  ));

-- Existing incomplete forms are recovery work, never Purchaser work. Clear a
-- legacy Purchaser assignment and distribute otherwise-unassigned captures
-- across active Call Centre accounts, oldest account first.
update public.partial_leads
set purchaser_id = null
where purchaser_id is not null
  and converted_lead_id is null;

do $$
declare
  agent_ids uuid[];
  agent_count integer;
begin
  select array_agg(id order by created_at asc, id asc)
  into agent_ids
  from public.profiles
  where role = 'call_center' and is_active = true;

  agent_count := coalesce(array_length(agent_ids, 1), 0);
  if agent_count = 0 then return; end if;

  with unassigned as (
    select id, row_number() over (order by created_at asc, id asc) as position
    from public.partial_leads
    where converted_lead_id is null and call_center_id is null
  )
  update public.partial_leads as partial
  set call_center_id = agent_ids[((unassigned.position - 1) % agent_count) + 1],
      updated_at = now()
  from unassigned
  where partial.id = unassigned.id;
end;
$$;

-- The public capture RPC gets a server-selected Call Centre account. Existing
-- rows keep their owner on repeat capture; the public browser never controls
-- an assignee.
drop function if exists public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text
);
drop function if exists public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, uuid
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
    make, model, year, mileage_km, description, call_center_id
  )
  values (
    p_phone, nullif(btrim(p_full_name), ''), coalesce(p_consent, false),
    greatest(coalesce(p_furthest_step, 1), 1), p_trigger, p_ip_hash,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), p_year, p_mileage_km,
    nullif(btrim(p_description), ''), p_call_center_id
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
    description     = coalesce(excluded.description, partial.description),
    call_center_id  = coalesce(partial.call_center_id, excluded.call_center_id),
    updated_at      = now()
  where partial.converted_lead_id is null;
end;
$$;

grant execute on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, uuid
) to service_role;
revoke all on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, uuid
) from public, anon, authenticated;

-- Assignment is an auditable partial-form event too.
-- Some early project databases predate migration 0021, so create the small
-- audit table here as well before changing its allowed event values.
create table if not exists public.partial_lead_events (
  id uuid primary key default gen_random_uuid(),
  partial_lead_id uuid not null references public.partial_leads(id) on delete cascade,
  type text not null check (type in ('note_updated', 'status_changed', 'assigned')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partial_lead_events_recent_idx
  on public.partial_lead_events (partial_lead_id, created_at desc);

alter table public.partial_lead_events enable row level security;
revoke all on public.partial_lead_events from anon, authenticated;
grant select, insert on public.partial_lead_events to service_role;

alter table public.partial_lead_events
  drop constraint if exists partial_lead_events_type_check;

alter table public.partial_lead_events
  add constraint partial_lead_events_type_check
  check (type in ('note_updated', 'status_changed', 'assigned'));

-- Keep the transactional follow-up RPC aligned with the database constraint.
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
  if p_status not in (
    'new', 'pending', 'contacted', 'inspection_scheduled',
    'inspected', 'negotiating', 'deal', 'closed'
  ) then
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

revoke all on function public.update_partial_lead_follow_up(uuid, text, text) from public, anon, authenticated;
grant execute on function public.update_partial_lead_follow_up(uuid, text, text) to service_role;
