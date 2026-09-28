-- One-time, admin-only demonstration batch state.
-- The rows are never exposed to the public client; the service-role API route
-- reads this table after the admin middleware has authenticated the request.
create table if not exists public.demo_lead_runs (
  id boolean primary key default true check (id = true),
  status text not null check (status in ('active', 'deleted')),
  lead_count integer not null default 0 check (lead_count >= 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.demo_lead_runs enable row level security;

revoke all on public.demo_lead_runs from anon, authenticated;

-- The API route uses the server-side service role. Grant only the operations
-- that route needs; public and signed-in browser clients remain denied.
grant select, insert, update on public.demo_lead_runs to service_role;
