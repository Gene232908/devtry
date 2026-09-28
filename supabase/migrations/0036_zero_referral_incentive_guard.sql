-- Referral incentives with a zero amount are not payable commission entries.
-- Keep the sale flow safe even if the Settings amount is left at its default.

create or replace function public.skip_zero_referral_incentive()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.incentive_aed <= 0 then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists staff_referral_incentives_skip_zero on public.staff_referral_incentives;
create trigger staff_referral_incentives_skip_zero
before insert on public.staff_referral_incentives
for each row execute function public.skip_zero_referral_incentive();

grant execute on function public.skip_zero_referral_incentive() to service_role;
