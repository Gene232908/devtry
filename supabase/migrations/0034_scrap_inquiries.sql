-- Permanent classification for vehicles submitted through the public Scrap flow.
-- This is deliberately separate from lead status: a Scrap Inquiry still follows
-- the ordinary New -> Contacted -> (optional) Inspection -> Deal/Closed workflow.

alter table public.leads
  add column if not exists inquiry_type text not null default 'valuation'
    check (inquiry_type in ('valuation', 'scrap')),
  add column if not exists scrap_condition text,
  add column if not exists scrap_asking_price_aed numeric
    check (scrap_asking_price_aed is null or scrap_asking_price_aed >= 0);

create index if not exists leads_inquiry_type_created_at_idx
  on public.leads (inquiry_type, created_at desc);

-- Classification is provenance, not an editable pipeline field. In particular,
-- a car submitted as Scrap must never be silently converted into a valuation lead.
create or replace function public.prevent_lead_inquiry_type_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.inquiry_type is distinct from new.inquiry_type then
    raise exception 'Lead inquiry type is permanent and cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists leads_prevent_inquiry_type_change on public.leads;
create trigger leads_prevent_inquiry_type_change
before update on public.leads
for each row execute function public.prevent_lead_inquiry_type_change();
