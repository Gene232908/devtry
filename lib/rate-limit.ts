/**
 * Minimal in-memory rate limiter for public API routes.
 *
 * Known limitation: state lives in the Node process memory only, so it resets on
 * cold starts and is not shared across serverless instances. This is a best-effort
 * defense-in-depth layer on top of Twilio Verify's own send/check attempt limits
 * (errors 60203/60202). Replace with a persistent store (e.g. Supabase) in Milestone 2.
 */

const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return false;
}
