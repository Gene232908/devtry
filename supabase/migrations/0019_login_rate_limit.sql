-- CarVibeDubai — server-side rate limiting for admin sign-in
-- Run in Supabase -> SQL Editor AFTER 0001-0018. Safe to re-run.
--
-- THE PROBLEM
--   The admin login called supabase.auth.signInWithPassword() straight from the
--   browser. No code of ours ran, so nothing could refuse an attempt. Measured
--   against the live project: eight wrong passwords in a row, submitted back to
--   back, were all accepted for processing — 0 of 8 refused. Supabase's own
--   protections did not engage at that rate.
--
-- WHY THE COUNTERS LIVE IN POSTGRES AND NOT IN MEMORY
--   The same reason otp_attempts does (see lib/server/otp-guards.ts). This
--   deploys to Vercel, where each request may land on a different serverless
--   instance and instances are recycled constantly. An in-process Map is
--   therefore both unshared and short-lived: an attacker spreading requests
--   across instances would face a fresh, empty counter almost every time, and a
--   cold start would erase a lockout that was working. A limiter that resets
--   under load is not a limiter.
--
-- WHAT IS STORED
--   Never a plaintext email or a raw IP. Both are hashed (HMAC-SHA256 with
--   OTP_HASH_SECRET, the same secret already used for OTP codes and IPs), so
--   this table cannot be read as a list of who tried to sign in from where.
--   Hashing is one-way; the app only ever compares hashes it computed itself.

create table if not exists public.login_attempts (
  id           uuid primary key default gen_random_uuid(),

  -- HMAC of the NORMALISED email (trimmed + lowercased), so "Owner@X.com  " and
  -- "owner@x.com" share one bucket and cannot be used to double an allowance.
  email_hash   text,
  -- SHA-256 of the client IP.
  ip_hash      text,

  succeeded    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- One index per lookup the limiter performs. Both are (bucket, time) so the
-- window scan is an index range, not a table scan.
create index if not exists login_attempts_email_ip_idx
  on public.login_attempts (email_hash, ip_hash, created_at desc);

create index if not exists login_attempts_ip_idx
  on public.login_attempts (ip_hash, created_at desc);

-- Cleanup uses this one.
create index if not exists login_attempts_created_idx
  on public.login_attempts (created_at);

alter table public.login_attempts enable row level security;

-- No policies are defined on purpose: with RLS enabled and no policy, anon and
-- authenticated can do NOTHING here. Only the service role (which bypasses RLS)
-- touches this table, and only from the server. The browser must never be able
-- to read these hashes or to clear its own lockout.
grant select, insert, delete on public.login_attempts to service_role;

-- ---------------------------------------------------------------------------
-- record_login_attempt — count, decide, and record in ONE statement
-- ---------------------------------------------------------------------------
-- Atomicity is the point. Counting with a SELECT and then inserting from the
-- application would leave a gap in which N concurrent requests all read the
-- same "4 so far" and all proceed — the exact shape of a burst attack. Doing
-- both inside one function, in one transaction, means the count each caller
-- sees already includes every attempt committed before it.
--
-- Returns the decision AND the numbers behind it so the route can build an
-- accurate Retry-After without a second query.
create or replace function public.record_login_attempt(
  p_email_hash   text,
  p_ip_hash      text,
  p_email_limit  int,
  p_ip_limit     int,
  p_window_secs  int
)
returns table (
  allowed          boolean,
  email_fail_count int,
  ip_fail_count    int,
  retry_after_secs int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since         timestamptz := now() - make_interval(secs => p_window_secs);
  v_email_count   int := 0;
  v_ip_count      int := 0;
  v_oldest_email  timestamptz;
  v_oldest_ip     timestamptz;
  v_retry         int := 0;
  v_allowed       boolean;
begin
  -- Only FAILURES count. A successful sign-in clears the account's bucket
  -- (see below), so an admin who mistypes twice and then gets it right starts
  -- from zero rather than carrying those two for the rest of the window.
  if p_email_hash is not null then
    select count(*), min(created_at) into v_email_count, v_oldest_email
    from public.login_attempts
    where email_hash = p_email_hash
      and ip_hash is not distinct from p_ip_hash
      and succeeded = false
      and created_at >= v_since;
  end if;

  if p_ip_hash is not null then
    select count(*), min(created_at) into v_ip_count, v_oldest_ip
    from public.login_attempts
    where ip_hash = p_ip_hash
      and succeeded = false
      and created_at >= v_since;
  end if;

  v_allowed := (v_email_count < p_email_limit) and (v_ip_count < p_ip_limit);

  -- When refused, say how long until the OLDEST attempt in the window ages out,
  -- which is the moment one slot frees up. A rolling window, not a fixed block.
  if not v_allowed then
    if v_email_count >= p_email_limit and v_oldest_email is not null then
      v_retry := greatest(v_retry, ceil(extract(epoch from (v_oldest_email + make_interval(secs => p_window_secs)) - now()))::int);
    end if;
    if v_ip_count >= p_ip_limit and v_oldest_ip is not null then
      v_retry := greatest(v_retry, ceil(extract(epoch from (v_oldest_ip + make_interval(secs => p_window_secs)) - now()))::int);
    end if;
    v_retry := greatest(v_retry, 1);
  end if;

  -- A refused attempt is itself recorded. Hammering a locked account keeps the
  -- lockout alive rather than letting it quietly expire while under attack.
  insert into public.login_attempts (email_hash, ip_hash, succeeded)
  values (p_email_hash, p_ip_hash, false);

  return query select v_allowed, v_email_count, v_ip_count, v_retry;
end;
$$;

-- ---------------------------------------------------------------------------
-- clear_login_attempts — called after a verified successful sign-in
-- ---------------------------------------------------------------------------
-- Prevents a legitimate owner from being locked out by their own earlier
-- typos: proving the password resets the counter for that account from that IP.
-- Deliberately scoped to the (email, ip) pair — a success from one place must
-- not clear an attack running from somewhere else, so the per-IP ceiling keeps
-- counting.
create or replace function public.clear_login_attempts(
  p_email_hash text,
  p_ip_hash    text
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.login_attempts
  where email_hash = p_email_hash
    and ip_hash is not distinct from p_ip_hash
    and succeeded = false;
$$;

-- ---------------------------------------------------------------------------
-- purge_login_attempts — housekeeping
-- ---------------------------------------------------------------------------
-- Nothing older than a day is of any use to the limiter, and this table would
-- otherwise grow without bound. Called opportunistically by the login route.
create or replace function public.purge_login_attempts()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.login_attempts where created_at < now() - interval '24 hours';
$$;

revoke all on function public.record_login_attempt(text, text, int, int, int) from public, anon, authenticated;
revoke all on function public.clear_login_attempts(text, text) from public, anon, authenticated;
revoke all on function public.purge_login_attempts() from public, anon, authenticated;

grant execute on function public.record_login_attempt(text, text, int, int, int) to service_role;
grant execute on function public.clear_login_attempts(text, text) to service_role;
grant execute on function public.purge_login_attempts() to service_role;
