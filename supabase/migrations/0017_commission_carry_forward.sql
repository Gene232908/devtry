-- CarVibeDubai — carry unbilled commission forward instead of orphaning it
-- Run in Supabase -> SQL Editor AFTER 0001-0016. Safe to re-run.
--
-- THE BUG THIS FIXES
--   0016 claimed entries for a month with `sold_at >= start AND sold_at < end`,
--   and skipped any statement already issued or paid. Its comment promised that
--   a sale landing in a settled month would be "picked up by the next open
--   month instead" — but nothing ever did that. The entry simply kept
--   statement_id = NULL forever.
--
--   Seen in real data: August was marked paid on the 3rd, a car sold on the
--   4th, and its AED 277.90 became invisible — absent from every statement,
--   with no warning anywhere. For a ledger that decides what someone is paid,
--   silently losing money is the worst possible failure.
--
-- THE FIX
--   A draft statement now claims every unbilled entry sold at any point up to
--   the end of its month — not just those inside it. Older stragglers are swept
--   into the earliest open month, which is what "carried forward" means and
--   what the original comment claimed happened.
--
--   Settled months are still never rewritten. An entry that arrives after its
--   own month closed is billed in the next open one, visibly, rather than
--   altering a figure already sent and paid.

create or replace function public.build_commission_statement(p_month date)
returns public.commission_statements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_stmt  public.commission_statements%rowtype;
begin
  insert into public.commission_statements (period_month)
  values (v_start)
  on conflict (period_month) do nothing;

  select * into v_stmt from public.commission_statements where period_month = v_start for update;

  if v_stmt.status <> 'draft' then
    -- Already issued or paid: hand back what it says, unchanged. Anything sold
    -- since is left unbilled here and picked up by the next open month below —
    -- which now genuinely happens, because the claim is no longer restricted to
    -- sales inside this month.
    return v_stmt;
  end if;

  -- Claim every unbilled entry sold up to the end of this month. The upper
  -- bound is the only one: entries from earlier months that were never billed
  -- (their month closed before they landed) are carried forward into this one.
  -- Callers build months oldest-first, so the earliest open month collects them.
  update public.commission_entries
     set statement_id = v_stmt.id
   where statement_id is null
     and sold_at < v_end;

  -- Release only entries that belong to a LATER month — a sale date corrected
  -- forward. An entry dated before this month is a legitimate carry-forward and
  -- must stay, which is why the old `sold_at < v_start` condition is gone.
  update public.commission_entries
     set statement_id = null
   where statement_id = v_stmt.id
     and sold_at >= v_end;

  update public.commission_statements s
     set entry_count          = agg.n,
         total_profit_aed     = agg.profit,
         total_commission_aed = agg.commission,
         updated_at           = now()
    from (
      select count(*)                         as n,
             coalesce(sum(profit_aed), 0)     as profit,
             coalesce(sum(commission_aed), 0) as commission
        from public.commission_entries
       where statement_id = v_stmt.id
    ) agg
   where s.id = v_stmt.id
  returning s.* into v_stmt;

  return v_stmt;
end;
$$;

grant execute on function public.build_commission_statement(date) to service_role;
