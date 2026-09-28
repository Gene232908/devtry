-- CarVibeDubai — manual vehicle expenses and confirmed net-profit commissions.
-- Apply after 0037_mileage_units.sql. This migration is additive: it does not
-- alter historical sales, commissions, payments, referrals, or catalog data.

create table if not exists public.inventory_expenses (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  description text not null check (char_length(btrim(description)) between 2 and 240),
  amount_aed numeric(12,2) not null check (amount_aed > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_expenses_inventory_idx
  on public.inventory_expenses (inventory_id, created_at desc);

create table if not exists public.inventory_financial_events (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  action text not null check (action in ('expenses_confirmed', 'financial_review_reopened')),
  reason text,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists inventory_financial_events_inventory_idx on public.inventory_financial_events (inventory_id, created_at desc);

alter table public.inventory
  add column if not exists expense_total_aed numeric(12,2) not null default 0 check (expense_total_aed >= 0),
  add column if not exists net_profit_aed numeric(12,2),
  add column if not exists financial_status text not null default 'not_required'
    check (financial_status in ('not_required', 'awaiting_confirmation', 'confirmed', 'paid_locked')),
  add column if not exists expenses_confirmed_at timestamptz,
  add column if not exists expenses_confirmed_by uuid references public.profiles(id) on delete restrict,
  add column if not exists financial_review_version integer not null default 0 check (financial_review_version >= 0);

create index if not exists inventory_financial_review_idx
  on public.inventory (financial_status, sold_at desc)
  where status = 'sold';

alter table public.inventory_expenses enable row level security;
alter table public.inventory_financial_events enable row level security;
grant select, insert, update, delete on public.inventory_expenses to service_role;
grant select, insert, update, delete on public.inventory_financial_events to service_role;

-- Sale records the sale itself only. Commission is not payable until expenses
-- are reviewed and the final base is frozen by finalize_inventory_finances().
drop function if exists public.sell_inventory_item(uuid, numeric, timestamptz, numeric, numeric, numeric);

create function public.sell_inventory_item(
  p_inventory_id uuid,
  p_sale_price numeric,
  p_sold_at timestamptz default now(),
  p_rate numeric default 0.0200,
  p_agent_rate numeric default 0.0200,
  p_purchaser_rate numeric default 0.1000
)
returns public.inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory%rowtype;
  v_sold_at timestamptz := coalesce(p_sold_at, now());
  v_expenses numeric(12,2);
begin
  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Inventory item not found' using errcode = 'no_data_found'; end if;
  if v_item.status = 'sold' then raise exception 'This car is already marked as sold' using errcode = 'unique_violation'; end if;
  if p_sale_price is null or p_sale_price < 0 then raise exception 'Sale price must be zero or more' using errcode = 'check_violation'; end if;

  select coalesce(sum(amount_aed), 0) into v_expenses from public.inventory_expenses where inventory_id = p_inventory_id;
  update public.inventory
     set status = 'sold', sale_price_aed = round(p_sale_price, 2), sold_at = v_sold_at,
         financial_status = 'awaiting_confirmation', expense_total_aed = round(v_expenses, 2),
         net_profit_aed = null, expenses_confirmed_at = null, expenses_confirmed_by = null,
         financial_review_version = financial_review_version + 1, updated_at = now()
   where id = p_inventory_id
   returning * into v_item;

  return v_item;
end;
$$;

-- Finalization is one locked, idempotent transaction: it freezes one shared
-- net-profit base and all role/developer commission rows together.
create function public.finalize_inventory_finances(
  p_inventory_id uuid,
  p_actor_id uuid,
  p_expected_review_version integer,
  p_rate numeric default 0.0200,
  p_agent_rate numeric default 0.0200,
  p_purchaser_rate numeric default 0.1000
)
returns public.commission_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory%rowtype;
  v_lead public.leads%rowtype;
  v_expenses numeric(12,2);
  v_net_profit numeric(12,2);
  v_entry public.commission_entries%rowtype;
begin
  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Inventory item not found' using errcode = 'no_data_found'; end if;
  if v_item.status <> 'sold' or v_item.sale_price_aed is null or v_item.sold_at is null then
    raise exception 'Record the sale before confirming expenses' using errcode = 'check_violation';
  end if;
  if v_item.financial_status <> 'awaiting_confirmation' then
    raise exception 'Expenses are already confirmed or locked' using errcode = 'unique_violation';
  end if;
  if p_expected_review_version is distinct from v_item.financial_review_version then
    raise exception 'Expenses changed. Review the latest total before confirming.' using errcode = 'serialization_failure';
  end if;

  select coalesce(sum(amount_aed), 0) into v_expenses
    from public.inventory_expenses where inventory_id = p_inventory_id;
  v_expenses := round(v_expenses, 2);
  v_net_profit := round(v_item.sale_price_aed - v_item.purchase_price_aed - v_expenses, 2);

  insert into public.commission_entries (
    inventory_id, purchase_price_aed, sale_price_aed, profit_aed, rate, commission_aed, sold_at
  ) values (
    p_inventory_id, v_item.purchase_price_aed, v_item.sale_price_aed, v_net_profit,
    p_rate, round(greatest(v_net_profit, 0) * p_rate, 2), v_item.sold_at
  ) returning * into v_entry;

  select * into v_lead from public.leads where id = v_item.lead_id;
  if found and v_lead.call_center_id is not null then
    insert into public.staff_commission_entries (inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at)
    values (p_inventory_id, v_lead.call_center_id, 'call_center', v_net_profit, p_agent_rate,
      round(greatest(v_net_profit, 0) * p_agent_rate, 2), v_item.sold_at);
  end if;
  if found and v_lead.purchaser_id is not null then
    insert into public.staff_commission_entries (inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at)
    values (p_inventory_id, v_lead.purchaser_id, 'purchaser', v_net_profit, p_purchaser_rate,
      round(greatest(v_net_profit, 0) * p_purchaser_rate, 2), v_item.sold_at);
  end if;

  update public.inventory
     set expense_total_aed = v_expenses, net_profit_aed = v_net_profit,
         financial_status = 'confirmed', expenses_confirmed_at = now(), expenses_confirmed_by = p_actor_id,
         updated_at = now()
   where id = p_inventory_id;

  insert into public.inventory_financial_events (inventory_id, action, actor_id)
  values (p_inventory_id, 'expenses_confirmed', p_actor_id);

  -- Referral evidence stays intact, but no automatic referral incentive is
  -- generated. The future company policy will require a separate approval flow.
  return v_entry;
end;
$$;

grant execute on function public.sell_inventory_item(uuid, numeric, timestamptz, numeric, numeric, numeric) to service_role;
grant execute on function public.finalize_inventory_finances(uuid, uuid, integer, numeric, numeric, numeric) to service_role;

-- Expense mutations go through this function so the review version can never
-- drift from the ledger. A confirmed/paid record is deliberately immutable;
-- unpaid corrections must use reopen_inventory_finances() first.
create function public.upsert_inventory_expense(
  p_inventory_id uuid,
  p_expense_id uuid,
  p_description text,
  p_amount_aed numeric,
  p_actor_id uuid
)
returns public.inventory_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory%rowtype;
  v_expense public.inventory_expenses%rowtype;
begin
  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Inventory item not found' using errcode = 'no_data_found'; end if;
  if v_item.financial_status in ('confirmed', 'paid_locked') then
    raise exception 'Expenses are confirmed. Reopen the financial review before editing.' using errcode = 'check_violation';
  end if;
  if p_description is null or char_length(btrim(p_description)) not between 2 and 240 then
    raise exception 'Enter an expense description between 2 and 240 characters.' using errcode = 'check_violation';
  end if;
  if p_amount_aed is null or p_amount_aed <= 0 then
    raise exception 'Enter an expense greater than zero.' using errcode = 'check_violation';
  end if;

  if p_expense_id is null then
    insert into public.inventory_expenses (inventory_id, description, amount_aed, created_by)
    values (p_inventory_id, btrim(p_description), round(p_amount_aed, 2), p_actor_id)
    returning * into v_expense;
  else
    update public.inventory_expenses
       set description = btrim(p_description), amount_aed = round(p_amount_aed, 2), updated_at = now()
     where id = p_expense_id and inventory_id = p_inventory_id
     returning * into v_expense;
    if not found then raise exception 'Expense not found' using errcode = 'no_data_found'; end if;
  end if;

  update public.inventory set financial_review_version = financial_review_version + 1,
    expense_total_aed = (select coalesce(round(sum(amount_aed), 2), 0) from public.inventory_expenses where inventory_id = p_inventory_id),
    updated_at = now() where id = p_inventory_id;
  return v_expense;
end;
$$;

create function public.delete_inventory_expense(p_inventory_id uuid, p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_item public.inventory%rowtype;
begin
  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Inventory item not found' using errcode = 'no_data_found'; end if;
  if v_item.financial_status in ('confirmed', 'paid_locked') then
    raise exception 'Expenses are confirmed. Reopen the financial review before editing.' using errcode = 'check_violation';
  end if;
  delete from public.inventory_expenses where id = p_expense_id and inventory_id = p_inventory_id;
  if not found then raise exception 'Expense not found' using errcode = 'no_data_found'; end if;
  update public.inventory set financial_review_version = financial_review_version + 1,
    expense_total_aed = (select coalesce(round(sum(amount_aed), 2), 0) from public.inventory_expenses where inventory_id = p_inventory_id),
    updated_at = now() where id = p_inventory_id;
end;
$$;

grant execute on function public.upsert_inventory_expense(uuid, uuid, text, numeric, uuid) to service_role;
grant execute on function public.delete_inventory_expense(uuid, uuid) to service_role;

create function public.reopen_inventory_finances(p_inventory_id uuid, p_actor_id uuid, p_reason text)
returns public.inventory
language plpgsql security definer set search_path = public as $$
declare v_item public.inventory%rowtype;
begin
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'Enter a correction reason between 3 and 500 characters.' using errcode = 'check_violation';
  end if;
  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Inventory item not found' using errcode = 'no_data_found'; end if;
  if v_item.financial_status <> 'confirmed' then
    raise exception 'Only an unpaid confirmed record can be reopened.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.staff_commission_entries where inventory_id = p_inventory_id and paid_at is not null)
    or exists (select 1 from public.commission_entries ce join public.commission_statements cs on cs.id = ce.statement_id where ce.inventory_id = p_inventory_id and cs.status = 'paid') then
    raise exception 'Commission has been paid. This correction requires a separate Super Admin settlement decision.' using errcode = 'check_violation';
  end if;
  delete from public.staff_commission_entries where inventory_id = p_inventory_id;
  delete from public.commission_entries where inventory_id = p_inventory_id;
  update public.inventory set financial_status = 'awaiting_confirmation', net_profit_aed = null,
    expenses_confirmed_at = null, expenses_confirmed_by = null,
    financial_review_version = financial_review_version + 1, updated_at = now()
    where id = p_inventory_id returning * into v_item;
  insert into public.inventory_financial_events (inventory_id, action, reason, actor_id)
  values (p_inventory_id, 'financial_review_reopened', btrim(p_reason), p_actor_id);
  return v_item;
end;
$$;

grant execute on function public.reopen_inventory_finances(uuid, uuid, text) to service_role;

-- Once any staff share is paid, normal expense editing stays locked. Developer
-- statement settlement is covered by the statement trigger below.
create or replace function public.pay_staff_commission(p_staff_id uuid)
returns table (paid_count int, paid_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_count int;
  v_role_total numeric(14,2);
  v_referral_count int;
  v_referral_total numeric(14,2);
begin
  select count(*), coalesce(sum(commission_aed), 0) into v_role_count, v_role_total
    from public.staff_commission_entries where staff_id = p_staff_id and paid_at is null;
  select count(*), coalesce(sum(incentive_aed), 0) into v_referral_count, v_referral_total
    from public.staff_referral_incentives where staff_id = p_staff_id and paid_at is null;

  update public.staff_commission_entries set paid_at = now() where staff_id = p_staff_id and paid_at is null;
  update public.staff_referral_incentives set paid_at = now() where staff_id = p_staff_id and paid_at is null;
  update public.inventory set financial_status = 'paid_locked', updated_at = now()
   where financial_status = 'confirmed'
     and exists (select 1 from public.staff_commission_entries sce where sce.inventory_id = inventory.id and sce.staff_id = p_staff_id and sce.paid_at is not null);
  return query select v_role_count + v_referral_count, v_role_total + v_referral_total;
end;
$$;

create or replace function public.lock_inventory_finances_after_statement_payment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update public.inventory set financial_status = 'paid_locked', updated_at = now()
     where financial_status = 'confirmed'
       and id in (select inventory_id from public.commission_entries where statement_id = new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists commission_statement_locks_inventory_finances on public.commission_statements;
create trigger commission_statement_locks_inventory_finances
after update of status on public.commission_statements
for each row execute function public.lock_inventory_finances_after_statement_payment();

grant execute on function public.pay_staff_commission(uuid) to service_role;
