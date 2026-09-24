-- Preserve abandoned Scrap forms as incomplete recovery work without ever
-- mixing them into ordinary valuations. Run after 0034_scrap_inquiries.sql.

alter table public.partial_leads
  add column if not exists inquiry_type text not null default 'valuation'
    check (inquiry_type in ('valuation', 'scrap')),
  add column if not exists scrap_condition text,
  add column if not exists scrap_asking_price_aed numeric
    check (scrap_asking_price_aed is null or scrap_asking_price_aed >= 0);

-- Bind each OTP proof to the form it was requested for. Without this, a code
-- requested for one flow could be replayed to bypass the other flow's
-- open-enquiry guard.
alter table public.whatsapp_otp_verifications
  add column if not exists inquiry_type text not null default 'valuation'
    check (inquiry_type in ('valuation', 'scrap'));

create index if not exists whatsapp_otp_verifications_phone_inquiry_idx
  on public.whatsapp_otp_verifications (phone_number, inquiry_type, created_at desc);

-- One person may legitimately start one valuation and one Scrap enquiry. A
-- single phone-only unique key would merge those unrelated enquiries.
alter table public.partial_leads
  drop constraint if exists partial_leads_phone_e164_key;

alter table public.partial_leads
  add constraint partial_leads_phone_inquiry_type_key unique (phone_e164, inquiry_type);

create index if not exists partial_leads_inquiry_type_open_idx
  on public.partial_leads (inquiry_type, created_at desc)
  where converted_lead_id is null;

drop function if exists public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid
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
  p_scrap_asking_price_aed   numeric default null
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
  if p_scrap_asking_price_aed is not null and p_scrap_asking_price_aed < 0 then
    raise exception 'Invalid scrap asking price';
  end if;

  -- A completed row is only staging history. Clear it after the existing race
  -- grace window, but never let an in-flight capture recreate it immediately.
  delete from public.partial_leads
  where phone_e164 = p_phone
    and inquiry_type = p_inquiry_type
    and converted_at is not null
    and converted_at < now() - interval '30 minutes';

  insert into public.partial_leads as partial (
    phone_e164, full_name, consent, furthest_step, last_trigger, request_ip_hash,
    make, model, year, mileage_km, specification, description, call_center_id,
    inquiry_type, scrap_condition, scrap_asking_price_aed
  ) values (
    p_phone, nullif(btrim(p_full_name), ''), coalesce(p_consent, false),
    greatest(coalesce(p_furthest_step, 1), 1), p_trigger, p_ip_hash,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), p_year, p_mileage_km,
    nullif(btrim(p_specification), ''), nullif(btrim(p_description), ''), p_call_center_id,
    p_inquiry_type, nullif(btrim(p_scrap_condition), ''), p_scrap_asking_price_aed
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
    specification           = coalesce(excluded.specification, partial.specification),
    description             = coalesce(excluded.description, partial.description),
    scrap_condition         = coalesce(excluded.scrap_condition, partial.scrap_condition),
    scrap_asking_price_aed  = coalesce(excluded.scrap_asking_price_aed, partial.scrap_asking_price_aed),
    call_center_id          = coalesce(partial.call_center_id, excluded.call_center_id),
    updated_at              = now()
  where partial.converted_lead_id is null;
end;
$$;

drop function if exists public.mark_partial_lead_converted(text, uuid);
create function public.mark_partial_lead_converted(
  p_phone text,
  p_lead_id uuid,
  p_inquiry_type text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.partial_leads
  set converted_lead_id = p_lead_id,
      converted_at = now(),
      updated_at = now()
  where phone_e164 = p_phone
    and inquiry_type = p_inquiry_type
    and converted_lead_id is null;
$$;

revoke all on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid, text, text, numeric
) from public, anon, authenticated;
grant execute on function public.capture_partial_lead(
  text, text, int, boolean, text, text, text, text, int, int, text, text, uuid, text, text, numeric
) to service_role;
revoke all on function public.mark_partial_lead_converted(text, uuid, text) from public, anon, authenticated;
grant execute on function public.mark_partial_lead_converted(text, uuid, text) to service_role;
