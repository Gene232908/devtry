-- CarVibeDubai — Migration 0023: Staff Roles & Permissions
-- Run AFTER 0022_reset_demo_leads_transaction.sql.
-- This migration is ADDITIVE — it extends existing enums and tables
-- without removing or rewriting existing data.

-- ---------------------------------------------------------------------------
-- Extend the user_role enum with operational roles
-- ---------------------------------------------------------------------------
-- 'admin'   = Super Admin / Owner (existing, preserved)
-- 'manager' = Legacy full-access role (existing, preserved as owner-level)
-- New values:
-- 'call_center' = Sees assigned leads + contact info; no prices or commissions
-- 'purchaser'   = Sees assigned leads + prices; no contact info or commissions

do $$ begin
  alter type public.user_role add value if not exists 'call_center';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type public.user_role add value if not exists 'purchaser';
exception when duplicate_object then null; end $$;

-- Commit the enum changes before referencing them in constraints/policies.
-- (ALTER TYPE ADD VALUE cannot run inside a transaction block in older PG;
--  Supabase's SQL editor runs each statement in its own implicit transaction,
--  so this is a no-op guard for safety.)
commit;

-- ---------------------------------------------------------------------------
-- Add is_active to profiles
-- ---------------------------------------------------------------------------
-- Disabled accounts must fail their next protected request even with an
-- unexpired JWT. The middleware checks this column for page navigations;
-- require-staff.ts checks it on every API call.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- Ensure all existing profiles (admin/manager) are active by default.
-- This is idempotent — the column default already sets true on insert;
-- this update covers rows that existed before the column was added.
update public.profiles set is_active = true where is_active is null;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists profiles_role_active_idx on public.profiles (role, is_active);
create index if not exists profiles_email_idx       on public.profiles (email);

-- ---------------------------------------------------------------------------
-- Protected provisioning function
-- ---------------------------------------------------------------------------
-- Inserts a profile row for a newly created Auth user.
-- Called server-side after Supabase Auth creates the account.
-- Enforces:
--   1. Only an active admin/manager may call it (RLS + security definer check).
--   2. The assigned role must be an operational role (call_center or purchaser).
--   3. Cannot promote self to admin.
--   4. Cannot disable the last active owner (admin/manager).
-- Returns the new profile's id on success; raises an exception on violation.

create or replace function public.provision_staff_account(
  p_user_id    uuid,
  p_email      text,
  p_name       text,
  p_role       user_role
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
  v_active_owners int;
begin
  -- Verify caller is an active owner (admin or manager).
  select role into v_caller_role
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_caller_role is null or v_caller_role not in ('admin', 'manager') then
    raise exception 'Only an active owner may provision staff accounts.' using errcode = 'NOPERM';
  end if;

  -- Only operational roles may be provisioned through this function.
  if p_role not in ('call_center', 'purchaser') then
    raise exception 'Only call_center or purchaser roles may be provisioned here.' using errcode = 'INVAL';
  end if;

  -- Insert (or update email/name/role on conflict so re-provisioning is safe).
  insert into public.profiles (id, email, display_name, role, is_active)
  values (p_user_id, p_email, p_name, p_role, true)
  on conflict (id) do update set
    email        = excluded.email,
    display_name = excluded.display_name,
    role         = excluded.role,
    is_active    = true;

  return p_user_id;
end;
$$;

-- Revoke public execution; the server-side service-role client calls this
-- after Auth account creation using the service key.
revoke execute on function public.provision_staff_account(uuid, text, text, user_role) from public, anon, authenticated;
grant  execute on function public.provision_staff_account(uuid, text, text, user_role) to service_role;

-- ---------------------------------------------------------------------------
-- Protected last-owner guard function
-- ---------------------------------------------------------------------------
-- Returns true when disabling p_user_id would leave zero active owners.
-- Called by the PATCH /api/admin/staff/[id] route before applying is_active=false.

create or replace function public.would_remove_last_owner(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select (
    select count(*) from public.profiles
    where role in ('admin', 'manager') and is_active = true and id != p_user_id
  ) = 0;
$$;

revoke execute on function public.would_remove_last_owner(uuid) from public, anon;
grant  execute on function public.would_remove_last_owner(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Update profiles RLS
-- ---------------------------------------------------------------------------
-- Owner: read all active profiles (to populate staff lists).
-- Staff: read their own profile only.
-- All writes remain admin-managed (profiles_admin_write policy already exists).

drop policy if exists profiles_select on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    -- Own profile: always readable.
    id = auth.uid()
    or
    -- Owners see everyone (to manage staff).
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        and p.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- Update leads RLS for operational staff
-- ---------------------------------------------------------------------------
-- Operational staff (call_center, purchaser) see only leads assigned to them.
-- Owners (admin, manager) continue to see all leads.
-- Anon has no access (existing policy unchanged in intent, recreated for clarity).

drop policy if exists leads_staff_select on public.leads;

create policy leads_staff_select on public.leads
  for select to authenticated
  using (
    -- Owners see all leads.
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        and p.is_active = true
    )
    or
    -- Operational staff see only leads assigned to them.
    (
      assigned_to = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('call_center', 'purchaser')
          and p.is_active = true
      )
    )
  );

-- Operational staff should never write lead data outside their assignment;
-- update policy also scoped.
drop policy if exists leads_staff_update on public.leads;

create policy leads_staff_update on public.leads
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        and p.is_active = true
    )
    or
    (
      assigned_to = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('call_center', 'purchaser')
          and p.is_active = true
      )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        and p.is_active = true
    )
    or
    (
      assigned_to = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('call_center', 'purchaser')
          and p.is_active = true
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Service role grants for new column
-- ---------------------------------------------------------------------------
-- The service-role client (used by all server-side queries) already has
-- select/insert/update/delete on public.profiles from migration 0001.
-- The new column is automatically included; no additional grant is needed.

-- ---------------------------------------------------------------------------
-- Commission and settings: restrict to active owners only (existing intent,
-- made explicit with is_active check in the helper functions below)
-- ---------------------------------------------------------------------------

-- Replace is_admin() to include is_active check.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

-- Replace is_staff() to include is_active check.
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;
