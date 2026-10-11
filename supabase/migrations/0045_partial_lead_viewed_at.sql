-- Migration 0045: Add viewed_at timestamp to partial_leads
-- Tracks when an admin/CSR views an incomplete valuation or scrap form.

alter table if exists public.partial_leads
  add column if not exists viewed_at timestamptz;

create index if not exists idx_partial_leads_viewed_at
  on public.partial_leads(viewed_at)
  where viewed_at is null;
