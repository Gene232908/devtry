/**
 * Turning page_view rows into a count of PEOPLE.
 *
 * "Visitors" used to be a row count, so one person reading the landing page and
 * then Privacy and Terms was three visitors, and a refresh was a fourth. Every
 * page_view carries a `session_id` (see components/public/PageViewTracker.tsx),
 * and that is what identifies a person, so that is what gets counted.
 *
 * Kept free of any database import so the arithmetic — the part that is easy to
 * get subtly wrong and impossible to notice — can be unit tested directly.
 */

export type SessionRow = { session_id: string | null };
export type DatedSessionRow = SessionRow & { created_at: string };

/**
 * Upper bound on rows pulled to compute a distinct count.
 *
 * Reducing in JS rather than SQL is a deliberate trade: PostgREST cannot
 * express COUNT(DISTINCT ...), and at this site's volume the whole events table
 * is in the low hundreds. The cap makes the ceiling explicit instead of letting
 * the query grow without bound; past it, this belongs in a Postgres function.
 */
export const SESSION_SCAN_CAP = 50_000;

/**
 * A row with no session_id counts as its own visitor: it means the browser
 * refused storage. Collapsing them all into one person would under-count real
 * people far more badly than treating them separately over-counts.
 */
export function countDistinctSessions(rows: SessionRow[]): number {
  const seen = new Set<string>();
  let anonymous = 0;
  for (const row of rows) {
    if (row.session_id) seen.add(row.session_id);
    else anonymous++;
  }
  return seen.size + anonymous;
}

/**
 * Distinct visitors per day, for the same reason as the headline stat: the
 * chart said "visitors" while plotting page loads, so one person browsing three
 * pages drew a spike of three.
 *
 * A session spanning midnight counts once on each day it appears. That is
 * deliberate — a daily series answers "how many people came on this day", and
 * someone active on both days genuinely came on both.
 *
 * `dayKeyOf` is injected so this stays free of the UAE-timezone helpers and can
 * be tested with plain, obvious keys.
 */
export function countDistinctSessionsByDay(
  rows: DatedSessionRow[],
  days: { key: string; label: string }[],
  dayKeyOf: (d: Date) => string,
): { day: string; count: number }[] {
  const perDay = new Map(days.map((d) => [d.key, { seen: new Set<string>(), anonymous: 0 }]));

  for (const row of rows) {
    const bucket = perDay.get(dayKeyOf(new Date(row.created_at)));
    if (!bucket) continue;
    if (row.session_id) bucket.seen.add(row.session_id);
    else bucket.anonymous++;
  }

  return days.map((d) => {
    const bucket = perDay.get(d.key);
    return { day: d.label, count: bucket ? bucket.seen.size + bucket.anonymous : 0 };
  });
}
