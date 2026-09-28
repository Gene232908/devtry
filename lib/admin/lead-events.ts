/**
 * Shared vocabulary for the per-lead activity timeline (`lead_events`).
 *
 * Kept in its own module because the event type string is written by the API
 * route and read by the client, and a typo in either place fails silently —
 * the row is stored, no error is raised, and the view simply never appears.
 */

/** Written when an admin opens a lead's detail page. */
export const LEAD_VIEWED = "lead_viewed";

/**
 * How long after a recorded view a repeat is ignored.
 *
 * Thirty minutes is long enough to absorb refreshes, tab switches and
 * back-navigation within one sitting, and short enough that coming back after
 * lunch counts as a genuine second look.
 */
export const VIEW_DEDUPE_MINUTES = 30;

export type LeadEvent = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  note?: string;
  actorLabel?: string;
};

export type LeadViewSummary = {
  count: number;
  lastAt: string | null;
};

/** Date + time, e.g. "04 Aug 2026, 14:32". */
export function formatEventTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
}

/**
 * How the view summary reads on screen.
 *
 * "Today" and "Yesterday" are spelled out because they are the two answers that
 * change what someone does next — a lead nobody has opened since last week is a
 * different problem from one opened an hour ago, and a bare date makes the
 * reader work that out for themselves.
 */
export function formatViewSummary(views: LeadViewSummary): string {
  if (views.count === 0 || !views.lastAt) return "Not opened yet";

  const last = new Date(views.lastAt);
  const time = last.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  let when: string;
  if (last >= startOfToday) when = `today at ${time}`;
  else if (last >= startOfYesterday) when = `yesterday at ${time}`;
  else when = formatEventTimestamp(views.lastAt);

  const times = views.count === 1 ? "Opened once" : `Opened ${views.count}×`;
  return `${times} · last ${when}`;
}
