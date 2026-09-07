-- CarVibeDubai — clear test data so the dashboard can be exercised from empty
--
-- Paste into Supabase → SQL Editor and Run. NOT a migration: it changes no
-- schema, only rows, and is meant to be run again whenever a test round has
-- filled the dashboard with throwaway records.
--
-- WHAT IT KEEPS
--   profiles      the sign-in accounts — deleting these locks you out
--   settings      the business contact row
--   car_makes / car_models / car_trims   the real vehicle catalog the public
--                 valuation form is built from
--
-- WHAT IT REMOVES
--   every lead and everything hanging off one (activity, bought car, the
--   commission that car earned), every incomplete form, every OTP record,
--   every blocked number, and every failed-login counter.
--
-- ORDER MATTERS. Two foreign keys are ON DELETE RESTRICT — commission_entries
-- → inventory, and inventory → leads — so a car cannot be removed while its
-- commission still points at it, and a lead cannot be removed while it still
-- owns a car. Deleting in the wrong order fails with a foreign-key violation
-- rather than removing anything, which is why the sequence below is deliberate.
--
-- It runs inside one transaction: either all of it applies or none of it does,
-- so a failure halfway cannot leave the money tables half-emptied.

-- ---------------------------------------------------------------------------
-- Before
-- ---------------------------------------------------------------------------
select 'BEFORE' as when_, *
from (
  select
    (select count(*) from public.leads)                       as leads,
    (select count(*) from public.partial_leads)               as incomplete_forms,
    (select count(*) from public.lead_events)                 as activity,
    (select count(*) from public.inventory)                   as cars,
    (select count(*) from public.commission_entries)          as commission_entries,
    (select count(*) from public.commission_statements)       as statements,
    (select count(*) from public.otp_attempts)                as otp_attempts,
    (select count(*) from public.whatsapp_otp_verifications)  as otp_sends,
    (select count(*) from public.blocked_numbers)             as blocked,
    (select count(*) from public.login_attempts)              as login_attempts,
    (select count(*) from public.events)                      as analytics_events
) t;

begin;

-- ---------------------------------------------------------------------------
-- 1. Money first — these hold the RESTRICT locks on everything below
-- ---------------------------------------------------------------------------
delete from public.commission_entries;
delete from public.commission_statements;

-- ---------------------------------------------------------------------------
-- 2. Cars, then the leads that own them
-- ---------------------------------------------------------------------------
delete from public.inventory;

-- Detach the rows that merely POINT at a lead, so those references do not
-- survive as dangling ids. All three are ON DELETE SET NULL, so Postgres would
-- do this anyway — doing it explicitly keeps the intent visible.
update public.partial_leads              set converted_lead_id = null         where converted_lead_id is not null;
update public.blocked_numbers            set source_lead_id = null            where source_lead_id is not null;
update public.whatsapp_otp_verifications set valuation_submission_id = null   where valuation_submission_id is not null;

-- lead_events is ON DELETE CASCADE, so it empties with the leads. Cleared
-- explicitly first so the count in the AFTER report is honest either way.
delete from public.lead_events;
delete from public.leads;

-- ---------------------------------------------------------------------------
-- 3. Incomplete forms (captures that never became a lead)
-- ---------------------------------------------------------------------------
delete from public.partial_leads;

-- ---------------------------------------------------------------------------
-- 4. Phone verification and abuse guards
-- ---------------------------------------------------------------------------
-- Clearing these also clears any 3-attempt block and any daily OTP cap in
-- force, so a number that was locked out can be used for testing again.
delete from public.whatsapp_otp_verifications;
delete from public.otp_attempts;
delete from public.blocked_numbers;

-- ---------------------------------------------------------------------------
-- 5. Failed sign-in counters
-- ---------------------------------------------------------------------------
-- Releases any admin account currently rate-limited out of the login screen.
delete from public.login_attempts;

-- ---------------------------------------------------------------------------
-- 6. Analytics — visitor counts and button clicks
-- ---------------------------------------------------------------------------
-- COMMENT THIS OUT to keep your visitor history. It resets "Visitors today",
-- "Website visitors this week", and the WhatsApp / Call Now click counters to
-- zero. Worth clearing when the figures are all localhost traffic from testing.
delete from public.events;

commit;

-- ---------------------------------------------------------------------------
-- After — every number below should be 0 except the three kept tables
-- ---------------------------------------------------------------------------
select 'AFTER' as when_, *
from (
  select
    (select count(*) from public.leads)                       as leads,
    (select count(*) from public.partial_leads)               as incomplete_forms,
    (select count(*) from public.lead_events)                 as activity,
    (select count(*) from public.inventory)                   as cars,
    (select count(*) from public.commission_entries)          as commission_entries,
    (select count(*) from public.commission_statements)       as statements,
    (select count(*) from public.otp_attempts)                as otp_attempts,
    (select count(*) from public.whatsapp_otp_verifications)  as otp_sends,
    (select count(*) from public.blocked_numbers)             as blocked,
    (select count(*) from public.login_attempts)              as login_attempts,
    (select count(*) from public.events)                      as analytics_events
) t;

select 'KEPT' as what_, *
from (
  select
    (select count(*) from public.profiles)    as sign_in_accounts,
    (select count(*) from public.settings)    as settings_row,
    (select count(*) from public.car_makes)   as makes,
    (select count(*) from public.car_models)  as models,
    (select count(*) from public.car_trims)   as trims
) t;
