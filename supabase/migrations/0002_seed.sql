-- CarVibeDubai — Phase 1 seed data
-- Run AFTER 0001_init.sql.

-- ---------------------------------------------------------------------------
-- Business settings (single row). Update these values in the admin dashboard later.
-- ---------------------------------------------------------------------------
insert into public.settings (id, whatsapp_number, call_number, notify_email, buy_a_car_enabled, visible_stats)
values (
  1,
  '+971564145781',
  '+971564145781',
  'owner@carvibedubai.com',
  false,
  array['totalLeads','newToday','activeLeads','visitorsThisWeek','averageValue','whatsappClicks']
)
on conflict (id) do update set
  whatsapp_number = excluded.whatsapp_number,
  call_number     = excluded.call_number,
  notify_email    = excluded.notify_email,
  updated_at      = now();

-- ---------------------------------------------------------------------------
-- Admin bootstrap
-- profiles.id must equal an existing auth.users id, so an admin must FIRST sign
-- in once (Supabase Auth) before they can be promoted. After they have signed
-- in at least once, run the block below to grant roles by email.
-- ---------------------------------------------------------------------------
-- Grant admin/manager roles to known emails (no-op if they haven't signed in yet).
insert into public.profiles (id, role, email, display_name)
select u.id,
       case when u.email = 'carvibe025@gmail.com' then 'admin'::user_role
            when u.email = 'genemathew232@gmail.com' then 'admin'::user_role
            else 'manager'::user_role end,
       u.email,
       split_part(u.email, '@', 1)
from auth.users u
where u.email in ('carvibe025@gmail.com', 'genemathew232@gmail.com')
on conflict (id) do update set
  role  = excluded.role,
  email = excluded.email;
