-- Per-recipient alerts for a changed inspection appointment.
-- The lead event is the audit record; this table only tracks who has seen it.
create table if not exists public.inspection_schedule_notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.lead_events(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  lead_name text not null,
  assigned_purchaser_name text,
  previous_scheduled_at timestamptz not null,
  scheduled_at timestamptz not null,
  changed_by_name text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (event_id, recipient_id)
);

create index if not exists inspection_schedule_notifications_recipient_idx
  on public.inspection_schedule_notifications (recipient_id, read_at, created_at desc);

alter table public.inspection_schedule_notifications enable row level security;

revoke all on public.inspection_schedule_notifications from anon, authenticated;
grant select, insert, update on public.inspection_schedule_notifications to service_role;
