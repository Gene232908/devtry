-- CarVibeDubai — Milestone 3: bought-car inventory + developer commission ledger
-- Run in Supabase -> SQL Editor AFTER 0001-0013. Safe to re-run.
--
-- THE BUSINESS FLOW THIS SUPPORTS
--   A lead reaches status 'deal' when the customer agrees to sell. At that
--   moment the business has bought the car, so an inventory row is created
--   holding what was actually paid. The car then lives its own life: in stock,
--   reserved, sold, or withdrawn. When it sells, the profit and the developer's
--   2% share are worked out and frozen.
--
-- WHY inventory IS A SEPARATE TABLE AND NOT COLUMNS ON leads
--   A lead is a person and their enquiry; an inventory row is an asset the
--   business owns. They are also governed differently: KNOWN_ISSUES ISSUE-004
--   has an open UAE-privacy item about deleting or anonymising old lead data.
--   If the purchase and sale figures lived on the lead row, honouring a future
--   deletion request would destroy the commission history that both sides are
--   paid against. Keeping the money on its own record means personal data can
--   be erased without touching the financial ledger.
--
--   lead_id is UNIQUE and NOT NULL: for now every car must come from a website
--   lead (client's explicit scope decision). Dropping NOT NULL later is all
--   that is needed to allow auction/walk-in/trade-in stock.
--
--   ON DELETE RESTRICT, not CASCADE or SET NULL. A lead with a car attached
--   cannot be deleted out from under its own financial record. This is the
--   constraint that makes the paragraph above actually true rather than a
--   stated intention.

-- ---------------------------------------------------------------------------
-- inventory_status
-- ---------------------------------------------------------------------------
--   in_stock  — owned and available to sell
--   reserved  — a buyer is committed but the sale is not completed
--   sold      — sold on; sale price and date are recorded
--   withdrawn — no longer for sale (kept, scrapped, returned). Never earns
--               commission, and is kept rather than deleted so the money that
--               went out on it is still visible.
do $$ begin
  create type inventory_status as enum ('in_stock', 'reserved', 'sold', 'withdrawn');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- inventory — cars the business has bought and owns
-- ---------------------------------------------------------------------------
-- The vehicle columns are a SNAPSHOT copied from the lead at purchase time,
-- not a live join. The lead records what the customer claimed when they filled
-- the form; this records what was actually bought after an inspection. They can
-- legitimately differ, and the asset record must not silently change if anyone
-- later corrects the lead.
create table if not exists public.inventory (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null unique references public.leads(id) on delete restrict,

  make               text not null,
  model              text not null,
  trim               text,
  year               int  not null,
  mileage_km         int,

  purchase_price_aed numeric(12,2) not null check (purchase_price_aed > 0),
  purchased_at       timestamptz   not null default now(),

  status             inventory_status not null default 'in_stock',
  sale_price_aed     numeric(12,2) check (sale_price_aed >= 0),
  sold_at            timestamptz,

  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- A car cannot be marked sold without the two figures the commission is
  -- calculated from. Enforced here as well as in the API so no code path,
  -- present or future, can create a sale that cannot be paid against.
  constraint inventory_sold_is_complete check (
    status <> 'sold' or (sale_price_aed is not null and sold_at is not null)
  )
);

-- Inventory list: newest purchases first.
create index if not exists inventory_purchased_idx on public.inventory (purchased_at desc);
-- "What is still on the lot" — the default view, so it gets its own partial index.
create index if not exists inventory_open_idx on public.inventory (purchased_at desc)
  where status in ('in_stock', 'reserved');

-- ---------------------------------------------------------------------------
-- commission_entries — FROZEN record of one sale's developer share
-- ---------------------------------------------------------------------------
-- Written once, when a car is marked sold, and never recalculated afterwards.
--
-- WHY FROZEN RATHER THAN COMPUTED ON READ
--   These rows are what the developer is invoiced and paid against. If the
--   figures were derived live from inventory, correcting a typo in a purchase
--   price months later would silently change an amount that had already been
--   invoiced and settled. Freezing also means the rate can be renegotiated
--   without rewriting the history of everything already paid.
--
--   profit_aed may be negative — a car can sell at a loss and that must stay
--   visible. commission_aed may not: per the agreed rule a loss produces no
--   commission (an entry at zero) and does NOT reduce the commission owed on
--   other cars in the same period. That is the greatest(...) below.
--
--   Costs such as repairs, registration or transport are deliberately NOT
--   deducted. Per the milestone agreement, only the vehicle purchase price is
--   subtracted from the selling price.
create table if not exists public.commission_entries (
  id                 uuid primary key default gen_random_uuid(),
  inventory_id       uuid not null unique references public.inventory(id) on delete restrict,

  purchase_price_aed numeric(12,2) not null,
  sale_price_aed     numeric(12,2) not null,
  profit_aed         numeric(12,2) not null,
  rate               numeric(6,4)  not null default 0.0200,
  commission_aed     numeric(12,2) not null check (commission_aed >= 0),

  -- Decides which month and quarter this belongs to. Copied from the sale, not
  -- from when the row happened to be written.
  sold_at            timestamptz not null,
  created_at         timestamptz not null default now()
);

create index if not exists commission_entries_sold_idx on public.commission_entries (sold_at desc);

-- ---------------------------------------------------------------------------
-- sell_inventory_item — the ONLY write path for a completed sale
-- ---------------------------------------------------------------------------
-- Marks the car sold and writes its commission entry in ONE transaction.
--
-- This is a function rather than two calls from the API on purpose: a sold car
-- with no commission entry is money that quietly never gets invoiced, and that
-- is exactly what a failed second request would produce. Either both land or
-- neither does.
--
-- Idempotent by way of the unique constraint on inventory_id — a double submit
-- raises rather than paying twice. Re-selling an already-sold car is refused
-- explicitly so the caller gets a clear message instead of a constraint error.
create or replace function public.sell_inventory_item(
  p_inventory_id uuid,
  p_sale_price   numeric,
  p_sold_at      timestamptz default now(),
  p_rate         numeric default 0.0200
)
returns public.commission_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item   public.inventory%rowtype;
  v_profit numeric(12,2);
  v_entry  public.commission_entries%rowtype;
begin
  -- FOR UPDATE: two people pressing "Mark as sold" at once must not both pass
  -- the status check below.
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
    -- Loss floor: never negative, and a loss is not carried against other sales.
    round(greatest(v_profit, 0) * p_rate, 2),
    coalesce(p_sold_at, now())
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_lead_deal — the ONLY write path for "we bought this car"
-- ---------------------------------------------------------------------------
-- Moves the lead to 'deal' and creates its inventory row in ONE transaction,
-- for the same reason as sell_inventory_item: a lead marked as a completed
-- purchase with no car behind it is stock that never reaches the inventory
-- list, and therefore a sale that never earns commission.
--
-- Re-running it on a lead that already has a car UPDATES the purchase figures
-- rather than failing, so the owner can correct a mistyped price. That is
-- refused once the car has been sold — the commission entry froze the purchase
-- price at that moment, and editing it afterwards would leave the ledger
-- disagreeing with the invoice already raised from it.
create or replace function public.record_lead_deal(
  p_lead_id        uuid,
  p_purchase_price numeric,
  p_purchased_at   timestamptz default now()
)
returns public.inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead     public.leads%rowtype;
  v_existing public.inventory%rowtype;
  v_item     public.inventory%rowtype;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    raise exception 'Lead not found' using errcode = 'no_data_found';
  end if;

  if p_purchase_price is null or p_purchase_price <= 0 then
    raise exception 'Purchase price must be more than zero' using errcode = 'check_violation';
  end if;

  select * into v_existing from public.inventory where lead_id = p_lead_id for update;

  if found then
    if v_existing.status = 'sold' then
      raise exception 'This car has already been sold; its purchase price can no longer be changed'
        using errcode = 'check_violation';
    end if;

    update public.inventory
       set purchase_price_aed = p_purchase_price,
           purchased_at       = coalesce(p_purchased_at, now()),
           updated_at         = now()
     where id = v_existing.id
    returning * into v_item;
  else
    -- Vehicle details are snapshotted from the lead here, once. See the note at
    -- the top of this file on why this is a copy and not a live join.
    insert into public.inventory (
      lead_id, make, model, trim, year, mileage_km,
      purchase_price_aed, purchased_at
    )
    values (
      p_lead_id, v_lead.make, v_lead.model, v_lead.trim, v_lead.year, v_lead.mileage_km,
      p_purchase_price, coalesce(p_purchased_at, now())
    )
    returning * into v_item;
  end if;

  update public.leads
     set status = 'deal'
   where id = p_lead_id
     and status is distinct from 'deal';

  return v_item;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Same posture as every other admin table: staff may read, nobody writes from
-- the browser. All writes go through service-role API routes, which are gated
-- by middleware.ts and (while the walkthrough is running) the preview guard.
alter table public.inventory          enable row level security;
alter table public.commission_entries enable row level security;

drop policy if exists inventory_staff_select on public.inventory;
create policy inventory_staff_select on public.inventory
  for select to authenticated using (public.is_staff());

-- Deliberately admin-only, not is_staff(): the commission ledger is a contract
-- between the owner and the developer, not day-to-day sales information a
-- manager account needs to see.
drop policy if exists commission_entries_admin_select on public.commission_entries;
create policy commission_entries_admin_select on public.commission_entries
  for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.inventory          to service_role;
grant select, insert, update, delete on public.commission_entries to service_role;
grant execute on function public.sell_inventory_item(uuid, numeric, timestamptz, numeric) to service_role;
grant execute on function public.record_lead_deal(uuid, numeric, timestamptz) to service_role;
