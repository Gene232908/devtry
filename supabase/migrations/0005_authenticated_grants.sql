-- CarVibeDubai — Phase 3: grant base table privileges to the "authenticated"
-- Postgres role. RLS policies (0001_init.sql) already restrict which ROWS a
-- logged-in staff member can see/edit via is_staff()/is_admin() - but Postgres
-- also requires a base table-level GRANT before RLS even applies. Only
-- service_role had that grant until now, so any query made as a real logged-in
-- user (not the server's service-role key) failed with "permission denied for
-- table X" - which is what caused the admin-auth first-login check to
-- silently fail closed (defaulting to "no password change needed").
-- Run this in Supabase → SQL Editor. Safe to re-run.

grant select, update on public.profiles     to authenticated;
grant select, update on public.leads        to authenticated;
grant select              on public.lead_events  to authenticated;
grant select              on public.otp_attempts to authenticated;
grant select              on public.events       to authenticated;
grant select, update on public.settings     to authenticated;
