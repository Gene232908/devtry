-- Migration: 0024_staff_assignment_audit.sql
-- Adds explicit call_center_id and purchaser_id to leads and partial_leads,
-- replacing the ambiguous `assigned_to` for new workflows, but preserving
-- `assigned_to` for historical reference. Also tracks attribution in lead_events.

-- 1. Add assignment columns to `leads`
alter table public.leads
  add column call_center_id uuid references public.profiles(id) on delete set null,
  add column purchaser_id uuid references public.profiles(id) on delete set null;

create index idx_leads_call_center on public.leads(call_center_id);
create index idx_leads_purchaser on public.leads(purchaser_id);

-- 2. Add assignment columns to `partial_leads`
alter table public.partial_leads
  add column call_center_id uuid references public.profiles(id) on delete set null,
  add column purchaser_id uuid references public.profiles(id) on delete set null;

create index idx_partial_leads_call_center on public.partial_leads(call_center_id);
create index idx_partial_leads_purchaser on public.partial_leads(purchaser_id);

-- 3. Modify the recover_partial_lead function to transfer assignments atomically
create or replace function public.recover_partial_lead(p_id text, p_phone_e164 text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_partial public.partial_leads%rowtype;
begin
  select * into v_partial
  from public.partial_leads
  where id = p_id;

  if not found then
    raise exception 'Partial lead not found.';
  end if;

  if v_partial.converted_lead_id is not null then
    return v_partial.converted_lead_id;
  end if;

  -- Create the real lead
  insert into public.leads (
    phone_e164, phone_verified, source, make, model, trim, year,
    mileage_km, condition, option_level, emirate, status,
    call_center_id, purchaser_id
  )
  values (
    p_phone_e164, false, 'recovered',
    v_partial.make, v_partial.model, v_partial.trim, v_partial.year,
    v_partial.mileage_km, v_partial.condition, v_partial.option_level,
    v_partial.emirate, 'new',
    v_partial.call_center_id, v_partial.purchaser_id
  )
  returning id into v_lead_id;

  -- Update the partial lead to point to the new lead
  update public.partial_leads
  set converted_lead_id = v_lead_id
  where id = p_id;

  -- Record the recovery event
  insert into public.lead_events (lead_id, type, meta)
  values (
    v_lead_id,
    'recovered',
    '{}'::jsonb
  );

  return v_lead_id;
end;
$$;
