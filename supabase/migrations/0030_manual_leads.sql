-- Internal manual leads created by authenticated CarVibeDubai staff.
-- The source remains on the lead; the authenticated creator is immutable audit attribution.

alter table public.leads
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists leads_created_by_idx
  on public.leads (created_by, created_at desc)
  where created_by is not null;
