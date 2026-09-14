-- CarVibeDubai — staff referral evidence and sale-triggered incentives.
-- Apply after 0030_manual_leads.sql.

alter table public.settings
  add column if not exists referral_incentive_aed numeric(12,2) not null default 0
  check (referral_incentive_aed >= 0);

create table if not exists public.lead_referrals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  referrer_type text not null check (referrer_type in ('employee', 'client')),
  referrer_staff_id uuid references public.profiles(id) on delete restrict,
  referrer_client_name text,
  proof_note text not null check (char_length(btrim(proof_note)) between 3 and 1200),
  proof_storage_path text not null unique,
  proof_content_type text not null check (proof_content_type in ('image/jpeg', 'image/png', 'application/pdf')),
  proof_size_bytes integer not null check (proof_size_bytes > 0 and proof_size_bytes <= 8388608),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint lead_referrals_referrer_check check (
    (referrer_type = 'employee' and referrer_staff_id is not null and referrer_client_name is null)
    or
    (referrer_type = 'client' and referrer_staff_id is null and char_length(btrim(coalesce(referrer_client_name, ''))) >= 2)
  )
);

create index if not exists lead_referrals_staff_idx on public.lead_referrals (referrer_staff_id)
  where referrer_staff_id is not null;

-- A frozen entry is made only by sell_inventory_item at the moment the car is sold.
-- One inventory car can create one employee-referral incentive at most.
create table if not exists public.staff_referral_incentives (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null unique references public.inventory(id) on delete restrict,
  lead_id uuid not null references public.leads(id) on delete restrict,
  staff_id uuid not null references public.profiles(id) on delete restrict,
  incentive_aed numeric(12,2) not null check (incentive_aed >= 0),
  sold_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_referral_incentives_staff_idx
  on public.staff_referral_incentives (staff_id, paid_at, sold_at desc);

alter table public.lead_referrals enable row level security;
alter table public.staff_referral_incentives enable row level security;

grant select, insert, update, delete on public.lead_referrals to service_role;
grant select, insert, update, delete on public.staff_referral_incentives to service_role;

-- Proof is read through authenticated server routes only. No public object URL is created.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'referral-proofs',
  'referral-proofs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Replace the existing sale function with the same signature. Normal role
-- commissions retain their behavior; employee-referral incentive is an
-- additional frozen record sourced from the current Settings amount.
drop function if exists public.sell_inventory_item(uuid, numeric, timestamptz, numeric, numeric, numeric);

create function public.sell_inventory_item(
  p_inventory_id uuid,
  p_sale_price numeric,
  p_sold_at timestamptz default now(),
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
  v_referral public.lead_referrals%rowtype;
  v_profit numeric(12,2);
  v_entry public.commission_entries%rowtype;
  v_referral_amount numeric(12,2);
  v_sold_at timestamptz := coalesce(p_sold_at, now());
begin
  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Inventory item not found' using errcode = 'no_data_found'; end if;
  if v_item.status = 'sold' then raise exception 'This car is already marked as sold' using errcode = 'unique_violation'; end if;
  if p_sale_price is null or p_sale_price < 0 then raise exception 'Sale price must be zero or more' using errcode = 'check_violation'; end if;

  v_profit := p_sale_price - v_item.purchase_price_aed;

  update public.inventory
     set status = 'sold', sale_price_aed = p_sale_price, sold_at = v_sold_at, updated_at = now()
   where id = p_inventory_id;

  insert into public.commission_entries (inventory_id, purchase_price_aed, sale_price_aed, profit_aed, rate, commission_aed, sold_at)
  values (p_inventory_id, v_item.purchase_price_aed, p_sale_price, v_profit, p_rate, round(greatest(v_profit, 0) * p_rate, 2), v_sold_at)
  returning * into v_entry;

  select * into v_lead from public.leads where id = v_item.lead_id;

  if found and v_lead.call_center_id is not null then
    insert into public.staff_commission_entries (inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at)
    values (p_inventory_id, v_lead.call_center_id, 'call_center', v_profit, p_agent_rate, round(greatest(v_profit, 0) * p_agent_rate, 2), v_sold_at)
    on conflict (inventory_id, role) do nothing;
  end if;

  if found and v_lead.purchaser_id is not null then
    insert into public.staff_commission_entries (inventory_id, staff_id, role, profit_aed, rate, commission_aed, sold_at)
    values (p_inventory_id, v_lead.purchaser_id, 'purchaser', v_profit, p_purchaser_rate, round(greatest(v_profit, 0) * p_purchaser_rate, 2), v_sold_at)
    on conflict (inventory_id, role) do nothing;
  end if;

  select * into v_referral
    from public.lead_referrals
   where lead_id = v_item.lead_id
     and referrer_type = 'employee'
     and referrer_staff_id is not null;

  if found then
    select referral_incentive_aed into v_referral_amount from public.settings where id = 1;
    insert into public.staff_referral_incentives (inventory_id, lead_id, staff_id, incentive_aed, sold_at)
    values (p_inventory_id, v_item.lead_id, v_referral.referrer_staff_id, coalesce(v_referral_amount, 0), v_sold_at)
    on conflict (inventory_id) do nothing;
  end if;

  return v_entry;
end;
$$;

-- A single staff payment clears both normal role commission and referral
-- incentives, keeping one invoice and one payment action per employee.
drop function if exists public.pay_staff_commission(uuid);

create function public.pay_staff_commission(p_staff_id uuid)
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
  select count(*), coalesce(sum(commission_aed), 0)
    into v_role_count, v_role_total
    from public.staff_commission_entries
   where staff_id = p_staff_id and paid_at is null;

  select count(*), coalesce(sum(incentive_aed), 0)
    into v_referral_count, v_referral_total
    from public.staff_referral_incentives
   where staff_id = p_staff_id and paid_at is null;

  update public.staff_commission_entries set paid_at = now()
   where staff_id = p_staff_id and paid_at is null;
  update public.staff_referral_incentives set paid_at = now()
   where staff_id = p_staff_id and paid_at is null;

  return query select v_role_count + v_referral_count, v_role_total + v_referral_total;
end;
$$;

grant execute on function public.sell_inventory_item(uuid, numeric, timestamptz, numeric, numeric, numeric) to service_role;
grant execute on function public.pay_staff_commission(uuid) to service_role;
