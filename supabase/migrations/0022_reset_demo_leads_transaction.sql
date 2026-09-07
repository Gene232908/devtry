-- Delete the demonstration batch in one database transaction.
-- This avoids a long REST delete over hundreds of rows and safely removes any
-- demo inventory/commission dependencies created during a walkthrough.
create or replace function public.reset_demo_leads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_ids uuid[];
  inventory_ids uuid[];
  deleted_count integer := 0;
begin
  select coalesce(array_agg(id), '{}'::uuid[]) into demo_ids
  from public.leads
  where source = 'demonstration';

  select coalesce(array_agg(id), '{}'::uuid[]) into inventory_ids
  from public.inventory
  where lead_id = any(demo_ids);

  if cardinality(inventory_ids) > 0 then
    delete from public.commission_entries where inventory_id = any(inventory_ids);
    delete from public.inventory where id = any(inventory_ids);
  end if;

  delete from public.leads where id = any(demo_ids);
  get diagnostics deleted_count = row_count;

  update public.demo_lead_runs
  set status = 'deleted', lead_count = 0, deleted_at = now()
  where id = true;

  return deleted_count;
end;
$$;

grant execute on function public.reset_demo_leads() to service_role;
