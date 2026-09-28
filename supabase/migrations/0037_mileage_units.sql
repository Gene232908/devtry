-- Retain the mileage exactly as the customer entered it, while preserving the
-- existing kilometre value for internal calculations and legacy workflows.

alter table public.leads
  add column if not exists mileage_value integer,
  add column if not exists mileage_unit text not null default 'km'
    check (mileage_unit in ('km', 'miles'));

update public.leads
set mileage_value = mileage_km
where mileage_value is null;

alter table public.partial_leads
  add column if not exists mileage_value integer,
  add column if not exists mileage_unit text not null default 'km'
    check (mileage_unit in ('km', 'miles'));

update public.partial_leads
set mileage_value = mileage_km
where mileage_value is null;

drop function if exists public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid, text, text, numeric
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
  p_mileage_unit             text default 'km'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  delete from public.partial_leads
  where phone_e164 = p_phone
    and inquiry_type = p_inquiry_type
    and converted_at is not null
    and converted_at < now() - interval '30 minutes';

  insert into public.partial_leads as partial (
    phone_e164, full_name, consent, furthest_step, last_trigger, request_ip_hash,
    make, model, year, mileage_km, mileage_value, mileage_unit, specification,
    description, call_center_id, inquiry_type, scrap_condition, scrap_asking_price_aed
  ) values (
    p_phone, nullif(btrim(p_full_name), ''), coalesce(p_consent, false),
    greatest(coalesce(p_furthest_step, 1), 1), p_trigger, p_ip_hash,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), p_year, p_mileage_km,
    p_mileage_value, p_mileage_unit, nullif(btrim(p_specification), ''),
    nullif(btrim(p_description), ''), p_call_center_id, p_inquiry_type,
    nullif(btrim(p_scrap_condition), ''), p_scrap_asking_price_aed
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
    updated_at              = now()
  where partial.converted_lead_id is null;
end;
$$;

revoke all on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid, text, text, numeric, int, text
) from public, anon, authenticated;
grant execute on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid, text, text, numeric, int, text
) to service_role;
