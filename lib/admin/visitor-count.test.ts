import { describe, expect, it } from "vitest";
import { countDistinctSessions, countDistinctSessionsByDay } from "./visitor-count";
import {
  buildLastSevenUaeDays,
  formatTimeUntil,
  nextUaeMidnightUtc,
  startOfUaeDayUtc,
  uaeDayKey,
} from "@/lib/uae-time";

// The bug these guard against: "visitors" counted page_view ROWS, so one person
// browsing three pages was reported as three visitors.

describe("countDistinctSessions", () => {
  it("counts one person who opened several pages as one visitor", () => {
    const rows = [
      { session_id: "a" },
      { session_id: "a" },
      { session_id: "a" },
    ];
    expect(countDistinctSessions(rows)).toBe(1);
  });

  it("counts separate people separately", () => {
    const rows = [{ session_id: "a" }, { session_id: "b" }, { session_id: "a" }, { session_id: "c" }];
    expect(countDistinctSessions(rows)).toBe(3);
  });

  it("is zero when nobody visited", () => {
    expect(countDistinctSessions([])).toBe(0);
  });

  it("treats each row with no session as its own visitor", () => {
    // A browser that refused storage. Collapsing these into one person would
    // under-count real people worse than counting them separately over-counts.
    const rows = [{ session_id: null }, { session_id: null }];
    expect(countDistinctSessions(rows)).toBe(2);
  });

  it("adds anonymous rows on top of identified ones", () => {
    const rows = [{ session_id: "a" }, { session_id: "a" }, { session_id: null }];
    expect(countDistinctSessions(rows)).toBe(2);
  });
});

describe("countDistinctSessionsByDay", () => {
  // Plain date-only keys keep the timezone helpers out of the assertion.
  const dayKeyOf = (d: Date) => d.toISOString().slice(0, 10);
  const days = [
    { key: "2026-08-01", label: "Sat" },
    { key: "2026-08-02", label: "Sun" },
  ];

  it("counts one person browsing several pages in a day as one", () => {
    const rows = [
      { created_at: "2026-08-01T08:00:00.000Z", session_id: "a" },
      { created_at: "2026-08-01T08:01:00.000Z", session_id: "a" },
      { created_at: "2026-08-01T08:02:00.000Z", session_id: "a" },
    ];
    expect(countDistinctSessionsByDay(rows, days, dayKeyOf)).toEqual([
      { day: "Sat", count: 1 },
      { day: "Sun", count: 0 },
    ]);
  });

  it("counts a session that spans midnight once on each day", () => {
    const rows = [
      { created_at: "2026-08-01T23:59:00.000Z", session_id: "a" },
      { created_at: "2026-08-02T00:01:00.000Z", session_id: "a" },
    ];
    expect(countDistinctSessionsByDay(rows, days, dayKeyOf)).toEqual([
      { day: "Sat", count: 1 },
      { day: "Sun", count: 1 },
    ]);
  });

  it("ignores rows outside the requested window", () => {
    const rows = [
      { created_at: "2026-07-30T10:00:00.000Z", session_id: "old" },
      { created_at: "2026-08-02T10:00:00.000Z", session_id: "a" },
    ];
    expect(countDistinctSessionsByDay(rows, days, dayKeyOf)).toEqual([
      { day: "Sat", count: 0 },
      { day: "Sun", count: 1 },
    ]);
  });

  it("returns a zero for every day when there is no traffic", () => {
    expect(countDistinctSessionsByDay([], days, dayKeyOf)).toEqual([
      { day: "Sat", count: 0 },
      { day: "Sun", count: 0 },
    ]);
  });
});

/**
 * The Overview shows "visitors today" as a single number and the same figure as
 * the last point of the 7-day chart. They are produced by two different queries,
 * so nothing stops them drifting apart except the windows being identical.
 *
 * These pin that down: the chart's final bucket must open at exactly the instant
 * the daily stat starts counting from, and yesterday's bucket must be the value
 * the stat held when yesterday ended.
 */
describe("the daily stat and the chart's last day agree", () => {
  const NOW = new Date("2026-08-08T05:20:00.000Z"); // 09:20 UAE, a Saturday

  it("opens the final bucket exactly where 'visitors today' starts counting", () => {
    const days = buildLastSevenUaeDays(NOW);
    const last = days[days.length - 1];

    expect(last.startsAt.toISOString()).toBe(startOfUaeDayUtc(NOW).toISOString());
  });

  it("covers seven consecutive UAE days, oldest first", () => {
    const days = buildLastSevenUaeDays(NOW);

    expect(days).toHaveLength(7);
    for (let i = 1; i < days.length; i++) {
      const gap = days[i].startsAt.getTime() - days[i - 1].startsAt.getTime();
      expect(gap).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("counts today's visitors identically both ways", () => {
    const days = buildLastSevenUaeDays(NOW);
    const rows = [
      // Two people today.
      { created_at: "2026-08-08T05:20:05.000Z", session_id: "a" },
      { created_at: "2026-08-08T05:21:21.000Z", session_id: "b" },
      { created_at: "2026-08-08T05:22:00.000Z", session_id: "a" }, // same person again
      // One person yesterday — must not leak into today's figure.
      { created_at: "2026-08-07T10:00:00.000Z", session_id: "c" },
    ];

    // How the chart computes it.
    const series = countDistinctSessionsByDay(rows, days, uaeDayKey);
    const chartToday = series[series.length - 1].count;

    // How the stat computes it: everything at or after the UAE day boundary.
    const startOfToday = startOfUaeDayUtc(NOW);
    const statToday = countDistinctSessions(rows.filter((r) => new Date(r.created_at) >= startOfToday));

    expect(chartToday).toBe(2);
    expect(statToday).toBe(2);
    expect(chartToday).toBe(statToday);
  });

  it("keeps yesterday's total on yesterday after the stat has reset", () => {
    // The whole point of the daily reset: today starts at zero, but the day
    // that just ended keeps the figure it finished on.
    const justAfterMidnight = new Date("2026-08-08T20:00:30.000Z"); // 00:00:30 UAE, Aug 9
    const days = buildLastSevenUaeDays(justAfterMidnight);
    const rows = [
      { created_at: "2026-08-08T05:20:05.000Z", session_id: "a" },
      { created_at: "2026-08-08T05:21:21.000Z", session_id: "b" },
    ];

    const series = countDistinctSessionsByDay(rows, days, uaeDayKey);

    expect(series[series.length - 1].count).toBe(0); // today, freshly reset
    expect(series[series.length - 2].count).toBe(2); // yesterday, preserved
  });
});

/**
 * The reset countdown on the "Visitors today" card.
 *
 * The edges are what matter: a countdown that shows "00h 00m" for the last
 * minute of the day, or a negative time after midnight, reads as broken at
 * exactly the moment someone is watching it.
 */
describe("formatTimeUntil", () => {
  const NOW = new Date("2026-08-12T10:00:00.000Z");

  it("counts down in hours and minutes", () => {
    const target = new Date(NOW.getTime() + (4 * 60 + 32) * 60_000);
    expect(formatTimeUntil(target, NOW)).toBe("04h 32m");
  });

  it("pads a single-digit hour so the width never jumps", () => {
    expect(formatTimeUntil(new Date(NOW.getTime() + 65 * 60_000), NOW)).toBe("01h 05m");
  });

  it("says so in words under a minute instead of showing 00h 00m", () => {
    expect(formatTimeUntil(new Date(NOW.getTime() + 30_000), NOW)).toBe("under a minute");
  });

  it("never shows a negative time once the moment has passed", () => {
    expect(formatTimeUntil(new Date(NOW.getTime() - 60_000), NOW)).toBe("any moment");
  });

  it("lands on the next UAE midnight, not the viewer's", () => {
    // 14:00 in Dubai on the 12th — 10 hours left of the UAE day.
    const midnight = nextUaeMidnightUtc(NOW);
    expect(midnight.toISOString()).toBe("2026-08-12T20:00:00.000Z");
    expect(formatTimeUntil(midnight, NOW)).toBe("10h 00m");
  });
});
