-- CarVibeDubai — let a returning customer be captured again
-- Run in Supabase -> SQL Editor AFTER 0001-0012. Safe to re-run.
--
-- THE PROBLEM
-- capture_partial_lead refused to touch any row already marked converted. That
-- guard exists for a real race: a capture request still in flight when the lead
-- is created must not put a customer who just completed the form back onto the
-- incomplete list.
--
-- But it was written as "never again", not "not right now". Once a number
-- completed the form even once, it could never be captured as incomplete again —
-- so a returning customer who starts a second valuation and abandons it is
-- silently dropped, which is exactly the lead this feature exists to save.
--
-- THE FIX
-- Keep the race guard, but bound it in time. A capture racing a conversion
-- arrives within seconds; a returning customer comes back hours or days later.
-- So a conversion older than the grace window below is treated as finished
-- history, and the row is cleared to make way for the new attempt.
--
-- The completed lead itself is untouched — it lives in `leads` and is the real
-- record. A partial row was only ever a staging note for someone we could not
-- otherwise contact.
--
-- The "no duplicates" guarantee still holds: phone_e164 is still unique, so a
-- person can never be listed twice, and completing the form again marks the row
-- converted again and hides it again.

create or replace function public.capture_partial_lead(
  p_phone         text,
  p_full_name     text,
  p_furthest_step int,
  p_consent       boolean,
  p_trigger       text,
  p_ip_hash       text default null,
  p_make          text default null,
  p_model         text default null,
  p_year          int  default null,
  p_mileage_km    int  default null,
  p_description   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clear a finished conversion so the new attempt can be recorded. Anything
  -- converted inside the grace window is left alone — that is the in-flight
  -- capture this guard was written for.
  delete from public.partial_leads
  where phone_e164 = p_phone
    and converted_at is not null
    and converted_at < now() - interval '30 minutes';

  insert into public.partial_leads as pl (
    phone_e164, full_name, consent, furthest_step, last_trigger, request_ip_hash,
    make, model, year, mileage_km, description
  )
  values (
    p_phone, nullif(btrim(p_full_name), ''), coalesce(p_consent, false),
    greatest(coalesce(p_furthest_step, 1), 1), p_trigger, p_ip_hash,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), p_year, p_mileage_km,
    nullif(btrim(p_description), '')
  )
  on conflict (phone_e164) do update set
    full_name       = coalesce(excluded.full_name, pl.full_name),
    consent         = excluded.consent,
    furthest_step   = greatest(pl.furthest_step, excluded.furthest_step),
    last_trigger    = excluded.last_trigger,
    request_ip_hash = coalesce(excluded.request_ip_hash, pl.request_ip_hash),
    make            = coalesce(excluded.make, pl.make),
    model           = coalesce(excluded.model, pl.model),
    year            = coalesce(excluded.year, pl.year),
    mileage_km      = coalesce(excluded.mileage_km, pl.mileage_km),
    description     = coalesce(excluded.description, pl.description),
    updated_at      = now()
  where pl.converted_lead_id is null;
end;
$$;

grant execute on function public.capture_partial_lead(text, text, int, boolean, text, text, text, text, int, int, text) to service_role;
