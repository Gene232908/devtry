-- CarVibeDubai — Milestone 3 Phase 2: monthly commission statements
-- Run in Supabase -> SQL Editor AFTER 0001-0015. Safe to re-run.
--
-- The brief: "Keep a monthly record of the 2% share and prepare a summary for
-- payment every three months."
--
-- So the record is MONTHLY and the payment is QUARTERLY. Those are two
-- different things and the schema keeps them apart:
--
--   commission_statements — one row per calendar month. This is the record.
--   the quarter           — derived, not stored. A quarter is simply the three
--                           monthly statements whose period_month falls in it,
--                           and the payment summary sums them.
--
-- WHY THE QUARTER IS NOT A TABLE
--   Storing quarters as rows would mean two places that both claim to know the
--   total, and they would eventually disagree — a late sale backdated into a
--   closed month being the obvious way. Summing the months on demand means the
--   monthly statements are the single source of truth, and a quarter total can
--   never drift from the months it is made of.
--
-- Marking a quarter paid marks its three monthly statements paid. There is no
-- separate quarterly object to fall out of step.

-- ---------------------------------------------------------------------------
-- commission_statements — one per calendar month
-- ---------------------------------------------------------------------------
--   draft  — the month is still open, or closed but not yet issued. Totals are
--            recalculated every time it is generated.
--   issued — sent to the developer. Its entries are now locked (see below).
--   paid   — settled.
create table if not exists public.commission_statements (
  id             uuid primary key default gen_random_uuid(),

  -- Always the FIRST day of the month it covers, so it doubles as the unique
  -- key. A date rather than a year/month pair keeps ordering and range queries
  -- trivial.
  period_month   date not null unique,

  entry_count    int           not null default 0,
  total_profit_aed     numeric(14,2) not null default 0,
  total_commission_aed numeric(14,2) not null default 0,

  status         text not null default 'draft' check (status in ('draft', 'issued', 'paid')),
  issued_at      timestamptz,
  paid_at        timestamptz,
  /** Free text — bank reference, cheque number, however it was actually settled. */
  payment_note   text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint commission_statements_month_is_first_day check (extract(day from period_month) = 1)
);

create index if not exists commission_statements_month_idx
  on public.commission_statements (period_month desc);

-- ---------------------------------------------------------------------------
-- Link entries to the statement that billed them
-- ---------------------------------------------------------------------------
-- NULL = not yet on any statement. Once set, that entry has been billed and
-- must never be billed again, which is what makes regenerating a draft safe.
alter table public.commission_entries
  add column if not exists statement_id uuid references public.commission_statements(id) on delete set null;

create index if not exists commission_entries_statement_idx
  on public.commission_entries (statement_id);

-- ---------------------------------------------------------------------------
-- build_commission_statement — (re)build the draft for one month
-- ---------------------------------------------------------------------------
-- Idempotent: safe to call repeatedly while a month is still open, which is how
-- the Commission screen keeps a running total for the current month.
--
-- Refuses to touch a statement that has been issued or paid. A sale backdated
-- into a settled month is deliberately NOT swept into it — that would silently
-- change a figure already sent to the developer. It stays unbilled and is
-- picked up by the next open month instead, where both sides can see it.
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
    -- Already issued or paid: hand back what it says, unchanged.
    return v_stmt;
  end if;

  -- Claim every unbilled entry that sold inside this month. Entries already
  -- carrying another statement_id are left alone.
  update public.commission_entries
     set statement_id = v_stmt.id
   where sold_at >= v_start
     and sold_at <  v_end
     and (statement_id is null or statement_id = v_stmt.id);

  -- Release anything previously attached that no longer belongs (a sale date
  -- corrected into another month), so a rebuild cannot leave a stale total.
  update public.commission_entries
     set statement_id = null
   where statement_id = v_stmt.id
     and (sold_at < v_start or sold_at >= v_end);

  update public.commission_statements s
     set entry_count          = agg.n,
         total_profit_aed     = agg.profit,
         total_commission_aed = agg.commission,
         updated_at           = now()
    from (
      select count(*)                        as n,
             coalesce(sum(profit_aed), 0)    as profit,
             coalesce(sum(commission_aed), 0) as commission
        from public.commission_entries
       where statement_id = v_stmt.id
    ) agg
   where s.id = v_stmt.id
  returning s.* into v_stmt;

  return v_stmt;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_commission_statement_status — issue, or mark paid
-- ---------------------------------------------------------------------------
-- Forward only: draft -> issued -> paid. Going backwards would un-bill entries
-- that have already been sent to the developer.
create or replace function public.set_commission_statement_status(
  p_id     uuid,
  p_status text,
  p_note   text default null
)
returns public.commission_statements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stmt public.commission_statements%rowtype;
begin
  select * into v_stmt from public.commission_statements where id = p_id for update;

  if not found then
    raise exception 'Statement not found' using errcode = 'no_data_found';
  end if;

  if p_status not in ('issued', 'paid') then
    raise exception 'A statement can only move to issued or paid' using errcode = 'check_violation';
  end if;

  if v_stmt.status = 'paid' then
    raise exception 'This statement is already marked as paid' using errcode = 'check_violation';
  end if;

  if p_status = 'issued' and v_stmt.status <> 'draft' then
    raise exception 'Only a draft statement can be issued' using errcode = 'check_violation';
  end if;

  if v_stmt.entry_count = 0 then
    raise exception 'There are no sales in this month to bill' using errcode = 'check_violation';
  end if;

  update public.commission_statements
     set status       = p_status,
         issued_at    = case when p_status = 'issued' then now() else issued_at end,
         paid_at      = case when p_status = 'paid'   then now() else paid_at   end,
         payment_note = coalesce(p_note, payment_note),
         updated_at   = now()
   where id = p_id
  returning * into v_stmt;

  return v_stmt;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Admin-only, matching commission_entries: this is the owner/developer contract,
-- not information a manager account needs.
alter table public.commission_statements enable row level security;

drop policy if exists commission_statements_admin_select on public.commission_statements;
create policy commission_statements_admin_select on public.commission_statements
  for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.commission_statements to service_role;
grant execute on function public.build_commission_statement(date) to service_role;
grant execute on function public.set_commission_statement_status(uuid, text, text) to service_role;
