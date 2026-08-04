/**
 * Monthly commission statements, grouped into quarters for payment.
 *
 * Per the brief: the RECORD is monthly, the PAYMENT is every three months. The
 * quarter is derived here rather than stored, so a quarter total can never
 * drift from the months it is made of. See migration 0016.
 */

export type StatementStatus = "draft" | "issued" | "paid";

export type CommissionStatement = {
  id: string;
  /** First day of the month it covers, ISO date. */
  periodMonth: string;
  entryCount: number;
  totalProfitAed: number;
  totalCommissionAed: number;
  status: StatementStatus;
  issuedAt: string | null;
  paidAt: string | null;
  paymentNote: string;
  /**
   * How many of this statement's sales happened in an EARLIER month.
   *
   * A sale that lands after its own month has been issued or paid cannot be
   * added to that settled figure, so it is billed here instead. Surfacing the
   * count matters: without it, a month would quietly show more cars than were
   * sold in it and nobody could explain the difference.
   */
  carriedCount: number;
};

export type Quarter = {
  /** e.g. "2026-Q3" — stable key for lists. */
  key: string;
  label: string;
  year: number;
  /** 1-4. */
  quarter: number;
  /** Always in calendar order, and only months that have a statement. */
  months: CommissionStatement[];
  entryCount: number;
  totalProfitAed: number;
  totalCommissionAed: number;
  /**
   * The quarter as a whole:
   *   paid    — every month in it is paid
   *   issued  — all billed, at least one still unpaid
   *   partial — some months issued, some still draft
   *   draft   — nothing issued yet
   */
  status: "draft" | "partial" | "issued" | "paid";
};

export const STATEMENT_STATUS_LABEL: Record<StatementStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Parses `yyyy-mm-dd` by hand rather than via `new Date()`.
 *
 * `new Date("2026-08-01")` is parsed as UTC midnight, which in any timezone
 * behind UTC renders as the 31st of the previous month — so a statement for
 * August would be labelled July. The business is in UAE (UTC+4, always ahead)
 * so it would not bite today, but this runs in the browser on whatever machine
 * the owner happens to be using.
 */
function parseMonth(iso: string): { year: number; month: number } {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  return { year: y, month: m };
}

/** The first of the following month, `yyyy-mm-01`. Rolls the year over. */
export function nextMonth(iso: string): string {
  const { year, month } = parseMonth(iso);
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

/** "August 2026" */
export function formatMonth(iso: string): string {
  const { year, month } = parseMonth(iso);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function quarterOf(iso: string): { year: number; quarter: number } {
  const { year, month } = parseMonth(iso);
  return { year, quarter: Math.floor((month - 1) / 3) + 1 };
}

function rollUpStatus(months: CommissionStatement[]): Quarter["status"] {
  if (months.length === 0) return "draft";
  if (months.every((m) => m.status === "paid")) return "paid";
  if (months.every((m) => m.status !== "draft")) return "issued";
  if (months.some((m) => m.status !== "draft")) return "partial";
  return "draft";
}

/**
 * Groups monthly statements into quarters, newest first, months inside each
 * quarter in calendar order.
 *
 * Months with no sales are simply absent — there is nothing to bill, and
 * showing an empty row for every quiet month would bury the ones that matter.
 */
export function groupIntoQuarters(statements: CommissionStatement[]): Quarter[] {
  const buckets = new Map<string, CommissionStatement[]>();

  for (const s of statements) {
    const { year, quarter } = quarterOf(s.periodMonth);
    const key = `${year}-Q${quarter}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(s);
    else buckets.set(key, [s]);
  }

  const quarters: Quarter[] = [];

  // Array.from rather than iterating the Map directly: this project's tsconfig
  // targets below ES2015, where a Map is not directly iterable.
  for (const [key, months] of Array.from(buckets.entries())) {
    months.sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
    const { year, quarter } = quarterOf(months[0].periodMonth);

    quarters.push({
      key,
      label: `Q${quarter} ${year}`,
      year,
      quarter,
      months,
      entryCount: months.reduce((n, m) => n + m.entryCount, 0),
      totalProfitAed: months.reduce((n, m) => n + m.totalProfitAed, 0),
      totalCommissionAed: months.reduce((n, m) => n + m.totalCommissionAed, 0),
      status: rollUpStatus(months),
    });
  }

  // Newest quarter first — the one being worked on is the one wanted on screen.
  quarters.sort((a, b) => b.year - a.year || b.quarter - a.quarter);
  return quarters;
}

/** Shape of a row from the Supabase `commission_statements` table. */
export type DbStatement = {
  id: string;
  period_month: string;
  entry_count: number;
  total_profit_aed: number | string;
  total_commission_aed: number | string;
  status: StatementStatus;
  issued_at: string | null;
  paid_at: string | null;
  payment_note: string | null;
};

export function mapDbStatement(r: DbStatement, carriedCount = 0): CommissionStatement {
  return {
    id: r.id,
    periodMonth: r.period_month.slice(0, 10),
    entryCount: Number(r.entry_count) || 0,
    totalProfitAed: Number(r.total_profit_aed) || 0,
    totalCommissionAed: Number(r.total_commission_aed) || 0,
    status: r.status,
    issuedAt: r.issued_at,
    paidAt: r.paid_at,
    paymentNote: r.payment_note ?? "",
    carriedCount,
  };
}

/** True when this sale happened outside the month billing it. */
export function isCarriedForward(soldAt: string, periodMonth: string): boolean {
  return soldAt.slice(0, 7) !== periodMonth.slice(0, 7);
}

/**
 * Every month from the first sale to the current month, so the API can build a
 * statement for each. Capped at 60 to bound the work if a date is ever wrong.
 */
export function monthsToBuild(earliestSoldAt: string | null): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let year = currentYear;
  let month = currentMonth;

  if (earliestSoldAt) {
    const parsed = parseMonth(earliestSoldAt);
    year = parsed.year;
    month = parsed.month;
  }

  const months: string[] = [];
  while ((year < currentYear || (year === currentYear && month <= currentMonth)) && months.length < 60) {
    months.push(`${year}-${String(month).padStart(2, "0")}-01`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}
