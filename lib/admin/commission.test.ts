import { describe, it, expect } from "vitest";
import {
  formatMonth,
  groupIntoQuarters,
  isCarriedForward,
  monthsToBuild,
  nextMonth,
  quarterOf,
  type CommissionStatement,
} from "./commission";

function stmt(periodMonth: string, over: Partial<CommissionStatement> = {}): CommissionStatement {
  return {
    id: `s-${periodMonth}`,
    periodMonth,
    entryCount: 1,
    totalProfitAed: 10000,
    totalCommissionAed: 200,
    status: "draft",
    issuedAt: null,
    paidAt: null,
    paymentNote: "",
    carriedCount: 0,
    ...over,
  };
}

describe("formatMonth", () => {
  it("names the month the statement actually covers", () => {
    expect(formatMonth("2026-08-01")).toBe("August 2026");
  });

  it("does not slip to the previous month in a timezone behind UTC", () => {
    // new Date("2026-01-01") is UTC midnight; in UTC-5 that renders as
    // 31 Dec 2025, which would label a January statement "December".
    expect(formatMonth("2026-01-01")).toBe("January 2026");
    expect(formatMonth("2026-12-01")).toBe("December 2026");
  });
});

describe("quarterOf", () => {
  it("maps each month to its calendar quarter", () => {
    expect(quarterOf("2026-01-01").quarter).toBe(1);
    expect(quarterOf("2026-03-01").quarter).toBe(1);
    expect(quarterOf("2026-04-01").quarter).toBe(2);
    expect(quarterOf("2026-09-01").quarter).toBe(3);
    expect(quarterOf("2026-10-01").quarter).toBe(4);
    expect(quarterOf("2026-12-01").quarter).toBe(4);
  });
});

describe("groupIntoQuarters", () => {
  it("sums the three months of a quarter into one payable total", () => {
    const quarters = groupIntoQuarters([
      stmt("2026-07-01", { totalCommissionAed: 300, totalProfitAed: 15000, entryCount: 2 }),
      stmt("2026-08-01", { totalCommissionAed: 350, totalProfitAed: 17500, entryCount: 1 }),
      stmt("2026-09-01", { totalCommissionAed: 100, totalProfitAed: 5000, entryCount: 1 }),
    ]);

    expect(quarters).toHaveLength(1);
    expect(quarters[0].label).toBe("Q3 2026");
    expect(quarters[0].totalCommissionAed).toBe(750);
    expect(quarters[0].totalProfitAed).toBe(37500);
    expect(quarters[0].entryCount).toBe(4);
  });

  it("keeps quarters newest-first but months inside them in calendar order", () => {
    const quarters = groupIntoQuarters([
      stmt("2026-02-01"),
      stmt("2026-08-01"),
      stmt("2026-01-01"),
      stmt("2026-07-01"),
    ]);

    expect(quarters.map((q) => q.label)).toEqual(["Q3 2026", "Q1 2026"]);
    expect(quarters[1].months.map((m) => m.periodMonth)).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("separates the same quarter number in different years", () => {
    const quarters = groupIntoQuarters([stmt("2025-08-01"), stmt("2026-08-01")]);
    expect(quarters.map((q) => q.label)).toEqual(["Q3 2026", "Q3 2025"]);
  });

  it("counts a quarter as paid only when every month in it is paid", () => {
    const allPaid = groupIntoQuarters([
      stmt("2026-07-01", { status: "paid" }),
      stmt("2026-08-01", { status: "paid" }),
    ]);
    expect(allPaid[0].status).toBe("paid");

    const onePending = groupIntoQuarters([
      stmt("2026-07-01", { status: "paid" }),
      stmt("2026-08-01", { status: "issued" }),
    ]);
    expect(onePending[0].status).toBe("issued");
  });

  it("marks a quarter partial while some months are still draft", () => {
    const quarters = groupIntoQuarters([
      stmt("2026-07-01", { status: "issued" }),
      stmt("2026-08-01", { status: "draft" }),
    ]);
    expect(quarters[0].status).toBe("partial");
  });

  it("returns nothing when there are no statements", () => {
    expect(groupIntoQuarters([])).toEqual([]);
  });
});

describe("monthsToBuild", () => {
  it("returns just the current month when nothing has ever sold", () => {
    const months = monthsToBuild(null);
    expect(months).toHaveLength(1);
    const now = new Date();
    expect(months[0]).toBe(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
  });

  it("covers every month from the first sale to now, with no gaps", () => {
    const months = monthsToBuild("2026-01-15T00:00:00Z");
    expect(months[0]).toBe("2026-01-01");
    // Consecutive, and each one the first of its month.
    for (const m of months) expect(m.endsWith("-01")).toBe(true);
    expect(new Set(months).size).toBe(months.length);
  });

  it("rolls the year over correctly rather than producing month 13", () => {
    const months = monthsToBuild("2024-11-01T00:00:00Z");
    expect(months.slice(0, 4)).toEqual(["2024-11-01", "2024-12-01", "2025-01-01", "2025-02-01"]);
  });

  it("is bounded, so one bad date cannot generate thousands of months", () => {
    expect(monthsToBuild("1990-01-01T00:00:00Z").length).toBeLessThanOrEqual(60);
  });
});

describe("nextMonth", () => {
  it("steps to the following month", () => {
    expect(nextMonth("2026-08-01")).toBe("2026-09-01");
  });

  it("rolls December into the next January rather than month 13", () => {
    expect(nextMonth("2026-12-01")).toBe("2027-01-01");
  });

  it("always lands on the first of the month", () => {
    expect(nextMonth("2026-01-31T12:00:00Z")).toBe("2026-02-01");
  });
});

describe("isCarriedForward", () => {
  // A sale that arrives after its own month was settled has to be billed
  // somewhere later. This is what tells the UI to explain that, rather than
  // showing a month with more cars than were sold in it.
  it("is false when the sale happened in the month billing it", () => {
    expect(isCarriedForward("2026-08-04T10:00:00Z", "2026-08-01")).toBe(false);
  });

  it("is true when the sale happened before the month billing it", () => {
    expect(isCarriedForward("2026-08-04T10:00:00Z", "2026-09-01")).toBe(true);
  });

  it("does not confuse the same month in different years", () => {
    expect(isCarriedForward("2025-08-04T10:00:00Z", "2026-08-01")).toBe(true);
  });
});
