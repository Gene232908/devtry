-- Keep one incomplete record per opened public form even when a visitor
-- corrects a valid-looking phone typo after an earlier autosave.

begin;

alter table public.partial_leads
  add column if not exists capture_session_id uuid,
  add column if not exists capture_revision integer not null default 0
    check (capture_revision >= 0);

create unique index if not exists partial_leads_capture_session_idx
  on public.partial_leads (capture_session_id, inquiry_type)
  where capture_session_id is not null;

drop function if exists public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text,
  uuid, text, text, numeric, int, text
);

create function public.capture_partial_lead(
  p_phone                    text,
  p_full_name                text,
  p_furthest_step            int,
  p_consent                  boolean,
  p_trigger                  text,
  p_ip_hash                  text default null,
  p_make                     text default null,
  p_model                    text default null,
  p_year                     int default null,
  p_mileage_km               int default null,
  p_specification            text default null,
  p_description              text default null,
  p_call_center_id           uuid default null,
  p_inquiry_type             text default 'valuation',
  p_scrap_condition          text default null,
  p_scrap_asking_price_aed   numeric default null,
  p_mileage_value            int default null,
  p_mileage_unit             text default 'km',
  p_capture_session_id       uuid default null,
  p_capture_revision         int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row_id uuid;
  session_revision integer;
  phone_row_id uuid;
begin
  if p_inquiry_type not in ('valuation', 'scrap') then
    raise exception 'Invalid inquiry type';
  end if;
  if p_mileage_unit not in ('km', 'miles') then
    raise exception 'Invalid mileage unit';
  end if;
  if p_mileage_value is not null and (p_mileage_value < 0 or p_mileage_value > 1000000) then
    raise exception 'Invalid mileage value';
  end if;
  if p_scrap_asking_price_aed is not null and p_scrap_asking_price_aed < 0 then
    raise exception 'Invalid scrap asking price';
  end if;
  if p_capture_revision is null or p_capture_revision < 0 or p_capture_revision > 1000000 then
    raise exception 'Invalid capture revision';
  end if;

  delete from public.partial_leads
  where phone_e164 = p_phone
    and inquiry_type = p_inquiry_type
    and converted_at is not null
    and converted_at < now() - interval '30 minutes';

  if p_capture_session_id is not null then
    select id, capture_revision
      into session_row_id, session_revision
    from public.partial_leads
    where capture_session_id = p_capture_session_id
      and inquiry_type = p_inquiry_type
      and converted_lead_id is null
    for update;

    -- A delayed autosave must not undo a newer phone correction.
    if session_row_id is not null and p_capture_revision < session_revision then
      return;
    end if;
  end if;

  select id
    into phone_row_id
  from public.partial_leads
  where phone_e164 = p_phone
    and inquiry_type = p_inquiry_type
  for update;

  if session_row_id is not null and session_row_id is distinct from phone_row_id then
    if phone_row_id is null then
      -- The phone changed and is not used by another incomplete record. Move
      -- the existing session row so its status, assignment, and activity stay.
      update public.partial_leads
      set phone_e164 = p_phone
      where id = session_row_id;
      phone_row_id := session_row_id;
    else
      -- The corrected phone already has a row. Keep that phone-deduped record
      -- and remove only the stale same-session typo record.
      delete from public.partial_leads
      where id = session_row_id
        and converted_lead_id is null;
    end if;
  end if;

  insert into public.partial_leads as partial (
    phone_e164, full_name, consent, furthest_step, last_trigger, request_ip_hash,
    make, model, year, mileage_km, mileage_value, mileage_unit, specification,
    description, call_center_id, inquiry_type, scrap_condition,
    scrap_asking_price_aed, capture_session_id, capture_revision
  ) values (
    p_phone, nullif(btrim(p_full_name), ''), coalesce(p_consent, false),
    greatest(coalesce(p_furthest_step, 1), 1), p_trigger, p_ip_hash,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), p_year, p_mileage_km,
    p_mileage_value, p_mileage_unit, nullif(btrim(p_specification), ''),
    nullif(btrim(p_description), ''), p_call_center_id, p_inquiry_type,
    nullif(btrim(p_scrap_condition), ''), p_scrap_asking_price_aed,
    p_capture_session_id, p_capture_revision
  )
  on conflict (phone_e164, inquiry_type) do update set
    full_name               = coalesce(excluded.full_name, partial.full_name),
    consent                 = excluded.consent,
    furthest_step           = greatest(partial.furthest_step, excluded.furthest_step),
    last_trigger            = excluded.last_trigger,
    request_ip_hash         = coalesce(excluded.request_ip_hash, partial.request_ip_hash),
    make                    = coalesce(excluded.make, partial.make),
    model                   = coalesce(excluded.model, partial.model),
    year                    = coalesce(excluded.year, partial.year),
    mileage_km              = coalesce(excluded.mileage_km, partial.mileage_km),
    mileage_value           = coalesce(excluded.mileage_value, partial.mileage_value),
    mileage_unit            = coalesce(excluded.mileage_unit, partial.mileage_unit),
    specification           = coalesce(excluded.specification, partial.specification),
    description             = coalesce(excluded.description, partial.description),
    scrap_condition         = coalesce(excluded.scrap_condition, partial.scrap_condition),
    scrap_asking_price_aed  = coalesce(excluded.scrap_asking_price_aed, partial.scrap_asking_price_aed),
    call_center_id          = coalesce(partial.call_center_id, excluded.call_center_id),
    capture_revision        = case
      when excluded.capture_session_id is not null
        and partial.capture_session_id is distinct from excluded.capture_session_id
        then excluded.capture_revision
      else greatest(partial.capture_revision, excluded.capture_revision)
    end,
    capture_session_id      = coalesce(excluded.capture_session_id, partial.capture_session_id),
    updated_at              = now()
  where partial.converted_lead_id is null
    and (
      excluded.capture_session_id is null
      or partial.capture_session_id is distinct from excluded.capture_session_id
      or excluded.capture_revision >= partial.capture_revision
    );
end;
$$;

revoke all on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text,
  uuid, text, text, numeric, int, text, uuid, int
) from public, anon, authenticated;
grant execute on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text,
  uuid, text, text, numeric, int, text, uuid, int
) to service_role;

commit;
