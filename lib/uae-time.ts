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

/**
 * UAE-local day-of-week (0=Sun..6=Sat) for the given instant. NOT the same as
 * calling `.getUTCDay()` on `startOfUaeDayUtc()`'s result - that value is a real
 * UTC instant (shifted back), so its UTC fields describe the UTC day, not the
 * UAE day. This reads the day-of-week from the still-shifted-forward value instead.
 */
export function uaeDayOfWeek(now: Date = new Date()): number {
  return new Date(now.getTime() + UAE_OFFSET_MS).getUTCDay();
}
