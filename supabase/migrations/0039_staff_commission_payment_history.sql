-- Permanent, auditable payout records for staff commission settlements.
-- Apply after 0038_expenses_net_profit_commissions.sql.

create table if not exists public.staff_commission_payments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete restrict,
  paid_by uuid references public.profiles(id) on delete restrict,
  paid_by_name text,
  total_aed numeric(14,2) not null check (total_aed > 0),
  entry_count integer not null check (entry_count > 0),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists staff_commission_payments_staff_paid_idx
  on public.staff_commission_payments (staff_id, paid_at desc);

alter table public.staff_commission_entries
  add column if not exists payment_id uuid references public.staff_commission_payments(id) on delete restrict;

alter table public.staff_referral_incentives
  add column if not exists payment_id uuid references public.staff_commission_payments(id) on delete restrict;

create index if not exists staff_commission_entries_payment_idx
  on public.staff_commission_entries (payment_id) where payment_id is not null;
create index if not exists staff_referral_incentives_payment_idx
  on public.staff_referral_incentives (payment_id) where payment_id is not null;

alter table public.staff_commission_payments enable row level security;
grant select, insert, update, delete on public.staff_commission_payments to service_role;

-- Existing paid rows predate the payment-history feature. Preserve their actual
-- amount and timestamp as a legacy record; the confirmer was not stored then.
insert into public.staff_commission_payments (staff_id, paid_by_name, total_aed, entry_count, paid_at)
select staff_id, 'Recorded before payment history', sum(amount_aed), sum(entry_count), paid_at
from (
  select staff_id, paid_at, commission_aed as amount_aed, 1 as entry_count
    from public.staff_commission_entries
   where paid_at is not null and payment_id is null
  union all
  select staff_id, paid_at, incentive_aed as amount_aed, 1 as entry_count
    from public.staff_referral_incentives
   where paid_at is not null and payment_id is null
) paid_rows
group by staff_id, paid_at
having sum(amount_aed) > 0;

update public.staff_commission_entries entry
set payment_id = payment.id
from public.staff_commission_payments payment
where entry.payment_id is null
  and entry.staff_id = payment.staff_id
  and entry.paid_at = payment.paid_at
  and payment.paid_by_name = 'Recorded before payment history';

update public.staff_referral_incentives incentive
set payment_id = payment.id
from public.staff_commission_payments payment
where incentive.payment_id is null
  and incentive.staff_id = payment.staff_id
  and incentive.paid_at = payment.paid_at
  and payment.paid_by_name = 'Recorded before payment history';

drop function if exists public.pay_staff_commission(uuid);

create function public.pay_staff_commission(p_staff_id uuid, p_paid_by uuid)
returns table (payment_id uuid, paid_count int, paid_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_count int;
  v_role_total numeric(14,2);
  v_referral_count int;
  v_referral_total numeric(14,2);
  v_paid_total numeric(14,2);
  v_paid_count int;
  v_payment_id uuid;
  v_paid_at timestamptz := now();
  v_paid_by_name text;
begin
  -- Serialise settlements for one staff account so two clicks cannot create
  -- duplicate payout records for the same unpaid rows.
  perform id from public.profiles where id = p_staff_id for update;
  if not found then raise exception 'Staff account not found' using errcode = 'no_data_found'; end if;

  select coalesce(display_name, 'Super Admin') into v_paid_by_name
    from public.profiles where id = p_paid_by;
  if v_paid_by_name is null then raise exception 'Payment confirmer not found' using errcode = 'foreign_key_violation'; end if;

  select count(*), coalesce(sum(commission_aed), 0) into v_role_count, v_role_total
    from public.staff_commission_entries where staff_id = p_staff_id and paid_at is null;
  select count(*), coalesce(sum(incentive_aed), 0) into v_referral_count, v_referral_total
    from public.staff_referral_incentives where staff_id = p_staff_id and paid_at is null;

  v_paid_count := v_role_count + v_referral_count;
  v_paid_total := v_role_total + v_referral_total;
  if v_paid_count = 0 or v_paid_total <= 0 then
    raise exception 'There is no unpaid commission to mark as paid' using errcode = 'check_violation';
  end if;

  insert into public.staff_commission_payments (staff_id, paid_by, paid_by_name, total_aed, entry_count, paid_at)
  values (p_staff_id, p_paid_by, v_paid_by_name, v_paid_total, v_paid_count, v_paid_at)
  returning id into v_payment_id;

  update public.staff_commission_entries
     set paid_at = v_paid_at, payment_id = v_payment_id
   where staff_id = p_staff_id and paid_at is null;
  update public.staff_referral_incentives
     set paid_at = v_paid_at, payment_id = v_payment_id
   where staff_id = p_staff_id and paid_at is null;
  update public.inventory set financial_status = 'paid_locked', updated_at = now()
   where financial_status = 'confirmed'
     and exists (select 1 from public.staff_commission_entries sce where sce.inventory_id = inventory.id and sce.staff_id = p_staff_id and sce.payment_id = v_payment_id);

  return query select v_payment_id, v_paid_count, v_paid_total;
end;
$$;

grant execute on function public.pay_staff_commission(uuid, uuid) to service_role;
