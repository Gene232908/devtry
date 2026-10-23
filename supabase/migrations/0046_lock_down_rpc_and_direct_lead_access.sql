-- CarVibeDubai — Migration 0046: lock down browser-callable functions and direct lead access
-- Run AFTER 0045_partial_lead_viewed_at.sql.
--
-- WHY
--   1. Postgres grants EXECUTE on every new function to PUBLIC. The SECURITY
--      DEFINER functions below never had that revoked, so anyone holding the
--      public (publishable/anon) key — which ships in the website's JavaScript —
--      could call them through /rest/v1/rpc/<name> with no login. They run as
--      the table owner and contain no role check, e.g. record_lead_deal could
--      rewrite a car's purchase price and reset_demo_leads could delete rows.
--   2. Staff sessions could SELECT/UPDATE public.leads directly through the
--      REST API. That let a purchaser read the phone number the app hides from
--      them and change status / estimated value without the API's rules.
--      The same direct read was open on otp_attempts (customer phone numbers
--      and IPs), lead_events (activity for every lead, not just assigned ones),
--      events (site analytics) and settings (notify email).
--
-- WHAT DOES NOT CHANGE
--   The app calls every one of these functions, and reads/writes all of these
--   tables, from server routes using the service-role client after its own
--   role checks, so those paths keep working. profiles is deliberately left
--   alone: requireStaff/requireAdmin read the caller's own profile through the
--   caller's session. Each function is granted to service_role
--   explicitly because revoking from PUBLIC would otherwise remove it there too.
--   The is_admin / is_owner / is_staff / is_operational_staff /
--   would_remove_last_owner helpers are left alone: RLS policies call them as
--   the signed-in user and they only return true/false. Trigger functions are
--   not callable through the API and are left alone as well. RLS policies on
--   leads stay in place (defence in depth); only the table privilege is removed.
--
-- Idempotent: safe to run more than once. Overloads are found by name, so the
-- exact argument lists may differ between environments.

begin;

-- 1. Direct REST access by signed-in staff (the app uses the service role)
revoke select, update on public.leads        from authenticated;
revoke select         on public.otp_attempts from authenticated;
revoke select         on public.lead_events  from authenticated;
revoke select         on public.events       from authenticated;
revoke select, update on public.settings     from authenticated;

-- 2. Browser-callable SECURITY DEFINER functions -> server only
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'build_commission_statement',
        'cleanup_expired_whatsapp_otps',
        'delete_inventory_expense',
        'finalize_inventory_finances',
        'pay_staff_commission',
        'record_lead_deal',
        'recover_partial_lead',
        'reopen_inventory_finances',
        'reset_demo_leads',
        'sell_inventory_item',
        'set_commission_statement_status',
        'upsert_inventory_expense'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

commit;
