-- 0042_selective_staff_commission_payouts.sql
-- Allow paying selected commission entries in advance or settling specific sales.

create or replace function public.pay_staff_commission(
  p_staff_id uuid,
  p_paid_by uuid,
  p_entry_ids uuid[] default null
)
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

  if p_entry_ids is not null and array_length(p_entry_ids, 1) > 0 then
    select count(*), coalesce(sum(commission_aed), 0) into v_role_count, v_role_total
      from public.staff_commission_entries
     where staff_id = p_staff_id and paid_at is null and id = any(p_entry_ids);

    select count(*), coalesce(sum(incentive_aed), 0) into v_referral_count, v_referral_total
      from public.staff_referral_incentives
     where staff_id = p_staff_id and paid_at is null and id = any(p_entry_ids);
  else
    select count(*), coalesce(sum(commission_aed), 0) into v_role_count, v_role_total
      from public.staff_commission_entries
     where staff_id = p_staff_id and paid_at is null;

    select count(*), coalesce(sum(incentive_aed), 0) into v_referral_count, v_referral_total
      from public.staff_referral_incentives
     where staff_id = p_staff_id and paid_at is null;
  end if;

  v_paid_count := v_role_count + v_referral_count;
  v_paid_total := v_role_total + v_referral_total;
  if v_paid_count = 0 or v_paid_total <= 0 then
    raise exception 'There is no unpaid commission to mark as paid' using errcode = 'check_violation';
  end if;

  insert into public.staff_commission_payments (staff_id, paid_by, paid_by_name, total_aed, entry_count, paid_at)
  values (p_staff_id, p_paid_by, v_paid_by_name, v_paid_total, v_paid_count, v_paid_at)
  returning id into v_payment_id;

  if p_entry_ids is not null and array_length(p_entry_ids, 1) > 0 then
    update public.staff_commission_entries
       set paid_at = v_paid_at, payment_id = v_payment_id
     where staff_id = p_staff_id and paid_at is null and id = any(p_entry_ids);

    update public.staff_referral_incentives
       set paid_at = v_paid_at, payment_id = v_payment_id
     where staff_id = p_staff_id and paid_at is null and id = any(p_entry_ids);
  else
    update public.staff_commission_entries
       set paid_at = v_paid_at, payment_id = v_payment_id
     where staff_id = p_staff_id and paid_at is null;

    update public.staff_referral_incentives
       set paid_at = v_paid_at, payment_id = v_payment_id
     where staff_id = p_staff_id and paid_at is null;
  end if;

  update public.inventory set financial_status = 'paid_locked', updated_at = now()
   where financial_status = 'confirmed'
     and exists (select 1 from public.staff_commission_entries sce where sce.inventory_id = inventory.id and sce.staff_id = p_staff_id and sce.payment_id = v_payment_id);

  return query select v_payment_id, v_paid_count, v_paid_total;
end;
$$;

grant execute on function public.pay_staff_commission(uuid, uuid, uuid[]) to service_role;
