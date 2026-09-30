-- Incomplete-form retention only. Confirmed leads, inspections, Inventory,
-- financial records, audit ledgers, and Vehicle Catalog rows are not touched.

begin;

alter table public.partial_leads
  add column if not exists archived_at timestamptz;

create index if not exists partial_leads_retention_candidates_idx
  on public.partial_leads (updated_at, id)
  where converted_lead_id is null;

create index if not exists partial_leads_active_updated_idx
  on public.partial_leads (updated_at desc, id)
  where converted_lead_id is null and archived_at is null;

-- A customer who starts the same form again is active again. Existing capture
-- and staff-update paths already advance updated_at, so this trigger restores
-- the row without duplicating it or rewriting the capture RPC signature.
create or replace function public.restore_archived_partial_lead_on_activity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.archived_at is not null and new.updated_at is distinct from old.updated_at then
    new.archived_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists restore_archived_partial_lead_on_activity on public.partial_leads;
create trigger restore_archived_partial_lead_on_activity
before update on public.partial_leads
for each row
execute function public.restore_archived_partial_lead_on_activity();

revoke all on function public.restore_archived_partial_lead_on_activity()
  from public, anon, authenticated;

-- Aggregate-only operational audit. It intentionally stores no customer data.
create table if not exists public.partial_lead_retention_runs (
  id uuid primary key default gen_random_uuid(),
  archive_cutoff timestamptz not null,
  delete_cutoff timestamptz not null,
  archived_count integer not null check (archived_count >= 0),
  deleted_count integer not null check (deleted_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.partial_lead_retention_runs enable row level security;
revoke all on public.partial_lead_retention_runs from public, anon, authenticated;
grant select, insert on public.partial_lead_retention_runs to service_role;

create or replace function public.run_partial_lead_retention(
  p_archive_cutoff timestamptz,
  p_delete_cutoff timestamptz,
  p_batch_size integer default 1000
)
returns table (archived_count integer, deleted_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_total integer := 0;
  deleted_total integer := 0;
begin
  if p_archive_cutoff is null or p_delete_cutoff is null then
    raise exception 'Retention cutoffs are required';
  end if;
  if p_delete_cutoff >= p_archive_cutoff then
    raise exception 'Delete cutoff must be older than archive cutoff';
  end if;
  if p_batch_size < 1 or p_batch_size > 5000 then
    raise exception 'Retention batch size must be between 1 and 5000';
  end if;

  with candidates as (
    select id
    from public.partial_leads
    where converted_lead_id is null
      and archived_at is null
      and updated_at < p_archive_cutoff
    order by updated_at asc, id asc
    limit p_batch_size
    for update skip locked
  ), archived as (
    update public.partial_leads as partial
    set archived_at = now()
    from candidates
    where partial.id = candidates.id
      and partial.converted_lead_id is null
      and partial.archived_at is null
      and partial.updated_at < p_archive_cutoff
    returning partial.id
  )
  select count(*)::integer into archived_total from archived;

  with candidates as (
    select id
    from public.partial_leads
    where converted_lead_id is null
      and archived_at is not null
      and updated_at < p_delete_cutoff
    order by updated_at asc, id asc
    limit p_batch_size
    for update skip locked
  ), deleted as (
    delete from public.partial_leads as partial
    using candidates
    where partial.id = candidates.id
      and partial.converted_lead_id is null
      and partial.archived_at is not null
      and partial.updated_at < p_delete_cutoff
    returning partial.id
  )
  select count(*)::integer into deleted_total from deleted;

  insert into public.partial_lead_retention_runs (
    archive_cutoff, delete_cutoff, archived_count, deleted_count
  ) values (
    p_archive_cutoff, p_delete_cutoff, archived_total, deleted_total
  );

  return query select archived_total, deleted_total;
end;
$$;

revoke all on function public.run_partial_lead_retention(timestamptz, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.run_partial_lead_retention(timestamptz, timestamptz, integer)
  to service_role;

commit;
