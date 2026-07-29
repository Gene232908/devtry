-- CarVibeDubai — OTP abuse / spend guards
-- Every OTP that reaches WhatsApp is billed per delivered message, so an
-- attacker looping the send endpoint spends the client's money directly.
-- lib/rate-limit.ts is in-memory only (resets on every serverless cold start
-- and is not shared across instances), so it cannot bound that spend. The
-- guards in lib/server/otp-guards.ts instead count real rows in
-- whatsapp_otp_verifications, which is authoritative: exactly one row is
-- inserted per send attempt, synchronously, before the message goes out.
--
-- This migration only adds the indexes those count queries need. No schema
-- or data changes. Run in Supabase -> SQL Editor AFTER 0001-0007. Safe to re-run.

-- Global 24h volume (the spend circuit breaker): counts every row in the window
-- regardless of phone, so it needs created_at on its own. The existing
-- whatsapp_otp_phone_created_idx is (phone_number, created_at) and cannot serve
-- a query that does not filter by phone_number.
create index if not exists whatsapp_otp_created_idx
  on public.whatsapp_otp_verifications (created_at desc);

-- Per-IP 24h volume. request_ip_hash is sha256(ip) — the raw IP is never stored.
create index if not exists whatsapp_otp_ip_created_idx
  on public.whatsapp_otp_verifications (request_ip_hash, created_at desc);
