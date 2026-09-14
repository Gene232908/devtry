-- Adds a trackable missed-appointment stage without changing the existing
-- inspection scheduling model. Apply after the inspection migrations.
alter type public.lead_status add value if not exists 'no_show';
