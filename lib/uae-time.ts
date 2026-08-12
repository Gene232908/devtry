// UAE (Asia/Dubai) is a fixed UTC+4 offset year-round - it never observes
// daylight saving time, so plain arithmetic here is safe and always correct
// without needing a timezone library.
const UAE_OFFSET_MS = 4 * 60 * 60 * 1000;

/** The UTC instant corresponding to 00:00:00 UAE time on the day containing `now`. */
export function startOfUaeDayUtc(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + UAE_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - UAE_OFFSET_MS);
}

/** True if both instants fall on the same UAE calendar day. */
export function isSameUaeDay(a: Date, b: Date = new Date()): boolean {
  return startOfUaeDayUtc(a).getTime() === startOfUaeDayUtc(b).getTime();
}

/**
 * Formats a date as a short UAE-local date, e.g. "21 Jan 2026". Date only —
 * admin screens show when something happened, not the minute, and a timestamp
 * rendered in the viewer's own timezone would be wrong for a UAE business.
 */
export function formatUaeDateShort(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

/** Formats a date as a UAE-local date string, e.g. "21 January 2026". */
export function formatUaeDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type UaeDay = {
  /** Stable grouping key (not displayed). */
  key: string;
  /** Short weekday label, e.g. "Sat". */
  label: string;
  /** The UTC instant this UAE day begins. */
  startsAt: Date;
};

/**
 * `YYYY-MM` for whichever UAE month contains `d`.
 *
 * Derived from the UAE day start rather than the raw instant, so a purchase
 * recorded at 22:00 UTC on the 31st — which is already the 1st in Dubai —
 * groups into the month the business would say it happened in.
 */
export function uaeMonthKey(d: Date): string {
  return uaeDayKey(d).slice(0, 7);
}

/** "August 2026" from a `YYYY-MM` key. */
export function formatUaeMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The UTC instant of the next UAE midnight after `now`. */
export function nextUaeMidnightUtc(now: Date = new Date()): Date {
  return new Date(startOfUaeDayUtc(now).getTime() + 24 * 60 * 60 * 1000);
}

/**
 * "04h 32m" — how long until the daily figures reset.
 *
 * Hours and minutes only. A ticking seconds counter on a dashboard draws the
 * eye to a number nobody acts on, and "resets in 4 minutes" is precise enough
 * to plan around. Under a minute it says so in words rather than showing
 * "00h 00m", which reads as broken.
 */
export function formatTimeUntil(target: Date, now: Date = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "any moment";

  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "under a minute";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

/** The grouping key for whichever UAE day contains `d`. */
export function uaeDayKey(d: Date): string {
  return startOfUaeDayUtc(d).toISOString().slice(0, 10);
}

/**
 * The last seven UAE calendar days, oldest first, ending with the day that
 * contains `now`.
 *
 * `startsAt` is carried deliberately. The chart query used to derive its lower
 * bound from `key` — a bare date — and send `"<key>T00:00:00.000Z"`, which is
 * twenty hours EARLIER than the UAE day actually starts. Every request pulled
 * an extra fifth of a day of rows across the network only to discard them for
 * matching no bucket.
 *
 * The last entry's `startsAt` is exactly `startOfUaeDayUtc(now)` — the same
 * boundary the "visitors today" stat uses — which is what guarantees that stat
 * and the final point of the chart are always computed over the identical set
 * of rows. `visitor-count.test.ts` pins that down.
 */
export function buildLastSevenUaeDays(now: Date = new Date()): UaeDay[] {
  const today = startOfUaeDayUtc(now);
  const days: UaeDay[] = [];

  for (let i = 6; i >= 0; i--) {
    // UAE has no DST, so every day is exactly 24h - safe to step by milliseconds.
    const startsAt = new Date(today.getTime() - i * ONE_DAY_MS);
    days.push({ key: uaeDayKey(startsAt), label: DAY_LABELS[uaeDayOfWeek(startsAt)], startsAt });
  }

  return days;
}

/**
 * UAE-local day-of-week (0=Sun..6=Sat) for the given instant. NOT the same as
 * calling `.getUTCDay()` on `startOfUaeDayUtc()`'s result - that value is a real
 * UTC instant (shifted back), so its UTC fields describe the UTC day, not the
 * UAE day. This reads the day-of-week from the still-shifted-forward value instead.
 */
export function uaeDayOfWeek(now: Date = new Date()): number {
  return new Date(now.getTime() + UAE_OFFSET_MS).getUTCDay();
}
