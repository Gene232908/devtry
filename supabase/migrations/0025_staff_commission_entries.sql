-- CarVibeDubai — Migration 0025: agent & purchaser commission entries
-- Run in Supabase -> SQL Editor AFTER 0001-0024 (both 0024 files). Safe to re-run.
--
-- THE GAP THIS CLOSES
--   `commission_entries` (0014) freezes only the DEVELOPER's 2% share of each
--   sale. The Commission page has always had "Agents" and "Purchasers" tabs
--   next to "Developer", but nothing ever wrote a row for either — the agent
--   who worked the lead and the purchaser who bought and resold the car earned
--   nothing anywhere in the database, no matter how many cars sold at a
--   profit. This is the missing half.
--
-- WHY A SEPARATE TABLE, NOT COLUMNS ON commission_entries
--   A sale has three payees (developer, agent, purchaser), not one, and any of
--   the latter two can be absent — a lead nobody was assigned, or assigned
--   before this feature existed. One row per (car, payee) lets a car with no
--   agent simply have no agent row, rather than a commission_entries row with
--   nullable agent/purchaser columns straining to describe three different
--   things at once.
--
-- WHY FROZEN, LIKE commission_entries
--   Same reasoning as 0014: these are the figures a person is actually paid
--   against. Correcting a purchase price after the fact must not silently
--   change an amount already promised to someone.
--
-- WHY paid_at ON THE ROW, NOT A STATEMENT TABLE LIKE THE DEVELOPER'S
--   The developer is paid quarterly against monthly records — a real
--   accounting cadence from the brief. Staff commission has no such
--   requirement; the product need is simpler: "how much do I owe this agent
--   right now" and "I just paid them, clear it." Marking every currently-
--   unpaid entry for a staff member paid does exactly that with no extra
--   object to keep in sync, and the current total is always just "unpaid
--   entries for this person," never a second table that could disagree.

create table if not exists public.staff_commission_entries (
  id             uuid primary key default gen_random_uuid(),
  inventory_id   uuid not null references public.inventory(id) on delete restrict,
  staff_id       uuid not null references public.profiles(id) on delete restrict,
  role           text not null check (role in ('call_center', 'purchaser')),

  profit_aed     numeric(12,2) not null,
  rate           numeric(6,4)  not null,
  commission_aed numeric(12,2) not null check (commission_aed >= 0),

  sold_at        timestamptz not null,
  paid_at        timestamptz,

  created_at     timestamptz not null default now(),

  -- A car has exactly one agent and one purchaser at the time it sells, so at
  -- most one row of each kind can ever exist for it. Also what makes writing
  -- these alongside the developer's entry safely re-runnable.
  unique (inventory_id, role)
);

create index if not exists staff_commission_entries_staff_idx
  on public.staff_commission_entries (staff_id, paid_at);

create index if not exists staff_commission_entries_sold_idx
  on public.staff_commission_entries (sold_at desc);

-- ---------------------------------------------------------------------------
-- sell_inventory_item — now also credits the agent and purchaser
-- ---------------------------------------------------------------------------
-- Signature is changing (two new trailing parameters), which in Postgres
-- creates a second overload rather than replacing the first unless the old
-- one is dropped explicitly first — so it is.
drop function if exists public.sell_inventory_item(uuid, numeric, timestamptz, numeric);

create or replace function public.sell_inventory_item(
  p_inventory_id   uuid,
  p_sale_price     numeric,
  p_sold_at        timestamptz default now(),
  p_rate           numeric default 0.0200,
  p_agent_rate     numeric default 0.0200,
  p_purchaser_rate numeric default 0.1000
)
returns public.commission_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item   public.inventory%rowtype;
  v_lead   public.leads%rowtype;
  v_profit numeric(12,2);
  v_entry  public.commission_entries%rowtype;
begin
  select * into v_item from public.inventory where id = p_inventory_id for update;

  if not found then
    raise exception 'Inventory item not found' using errcode = 'no_data_found';
  end if;

  if v_item.status = 'sold' then
    raise exception 'This car is already marked as sold' using errcode = 'unique_violation';
  end if;

  if p_sale_price is null or p_sale_price < 0 then
    raise exception 'Sale price must be zero or more' using errcode = 'check_violation';
  end if;

  v_profit := p_sale_price - v_item.purchase_price_aed;

  update public.inventory
     set status         = 'sold',
         sale_price_aed = p_sale_price,
         sold_at        = coalesce(p_sold_at, now()),
         updated_at     = now()
   where id = p_inventory_id;

  insert into public.commission_entries (
    inventory_id, purchase_price_aed, sale_price_aed,
    profit_aed, rate, commission_aed, sold_at
  )
  values (
    p_inventory_id, v_item.purchase_price_aed, p_sale_price,
    v_profit, p_rate,
    round(greatest(v_profit, 0) * p_rate, 2),
    coalesce(p_sold_at, now())
  )
  returning * into v_entry;

  -- Credit whichever agent and purchaser this car's originating lead carries.
  -- Neither is required: a lead nobody was assigned earns nobody a commission
  -- on this sale rather than inventing a payee for it.
  select * into v_lead from public.leads where id = v_item.lead_id;

  if found and v_lead.call_center_id is not null then
    insert into public.staff_commission_entries (
      inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at
    )
    values (
      p_inventory_id, v_lead.call_center_id, 'call_center',
      v_profit, p_agent_rate, round(greatest(v_profit, 0) * p_agent_rate, 2),
      coalesce(p_sold_at, now())
    )
    on conflict (inventory_id, role) do nothing;
  end if;

  if found and v_lead.purchaser_id is not null then
    insert into public.staff_commission_entries (
      inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at
    )
    values (
      p_inventory_id, v_lead.purchaser_id, 'purchaser',
      v_profit, p_purchaser_rate, round(greatest(v_profit, 0) * p_purchaser_rate, 2),
      coalesce(p_sold_at, now())
    )
    on conflict (inventory_id, role) do nothing;
  end if;

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- pay_staff_commission — settle everything currently owed to one staff member
-- ---------------------------------------------------------------------------
create or replace function public.pay_staff_commission(p_staff_id uuid)
returns table (paid_count int, paid_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_total numeric(14,2);
begin
  select count(*), coalesce(sum(commission_aed), 0)
    into v_count, v_total
    from public.staff_commission_entries
   where staff_id = p_staff_id
     and paid_at is null;

  update public.staff_commission_entries
     set paid_at = now()
   where staff_id = p_staff_id
     and paid_at is null;

  return query select v_count, v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill — credit sales that happened before this migration existed
-- ---------------------------------------------------------------------------
-- Without this, a car already sold (and profitable) before today would show
-- nothing on its agent's or purchaser's Commission tab forever, since
-- sell_inventory_item only runs at the moment of a NEW sale. `on conflict do
-- nothing` makes this safe to run again alongside a future 0014-style rebuild.
insert into public.staff_commission_entries (inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at)
select
  ce.inventory_id,
  l.call_center_id,
  'call_center',
  ce.profit_aed,
  0.0200,
  round(greatest(ce.profit_aed, 0) * 0.0200, 2),
  ce.sold_at
from public.commission_entries ce
join public.inventory inv on inv.id = ce.inventory_id
join public.leads l on l.id = inv.lead_id
where l.call_center_id is not null
on conflict (inventory_id, role) do nothing;

insert into public.staff_commission_entries (inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at)
select
  ce.inventory_id,
  l.purchaser_id,
  'purchaser',
  ce.profit_aed,
  0.1000,
  round(greatest(ce.profit_aed, 0) * 0.1000, 2),
  ce.sold_at
from public.commission_entries ce
join public.inventory inv on inv.id = ce.inventory_id
join public.leads l on l.id = inv.lead_id
where l.purchaser_id is not null
on conflict (inventory_id, role) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Same posture as every other admin table: staff may read, nobody writes from
-- the browser. All writes go through service-role API routes. Unlike the
-- developer ledger (admin-only), a staff member may read their OWN rows here —
-- this is what "My Commission" is showing them.
alter table public.staff_commission_entries enable row level security;

drop policy if exists staff_commission_entries_select on public.staff_commission_entries;
create policy staff_commission_entries_select on public.staff_commission_entries
  for select to authenticated
  using (public.is_admin() or staff_id = auth.uid());

grant select, insert, update, delete on public.staff_commission_entries to service_role;
grant execute on function public.sell_inventory_item(uuid, numeric, timestamptz, numeric, numeric, numeric) to service_role;
grant execute on function public.pay_staff_commission(uuid) to service_role;
