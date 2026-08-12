import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getOtpCaps, type OtpCaps } from "@/lib/server/otp-guards";
import { LEAD_PIPELINE } from "@/lib/format";
import { mapDbInventory, type DbInventory, type InventoryItem } from "@/lib/admin/inventory";
import { PARTIAL_LEAD_COLUMNS, type PartialLead } from "@/lib/admin/partial-lead";
import { buildLastSevenUaeDays, startOfUaeDayUtc, uaeDayKey } from "@/lib/uae-time";
import {
  countDistinctSessions,
  countDistinctSessionsByDay,
  SESSION_SCAN_CAP,
  type DatedSessionRow,
  type SessionRow,
} from "@/lib/admin/visitor-count";
import {
  isCarriedForward,
  mapDbStatement,
  monthsToBuild,
  nextMonth,
  type CommissionStatement,
  type DbStatement,
} from "@/lib/admin/commission";

/**
 * The read side of every admin screen, in one place.
 *
 * SERVER ONLY. Everything here uses the service-role client, so it must never
 * be imported from a "use client" module. (The `server-only` package is not a
 * top-level dependency in this project, so there is no build-time guard — the
 * practical one is that `getSupabaseAdmin()` reads a non-`NEXT_PUBLIC_` env var
 * and would be undefined in the browser anyway.)
 *
 * These used to live inside the route handlers. They were lifted out so that an
 * admin page can render its own first paint on the server, instead of shipping
 * an empty page that then calls its own API over HTTP — a round trip that went
 * back out through middleware and cost a second auth check. The route handlers
 * still exist and still behave identically; they are now thin wrappers, and
 * they remain the path used for refreshes and for anything client-side.
 *
 * Returning a result object rather than throwing keeps the two callers honest:
 * a route handler needs a status code, a Server Component needs a message to
 * hand its client child, and neither should have to guess.
 */
export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status: number };

const NOT_CONFIGURED = {
  ok: false as const,
  message: "Database is not configured.",
  status: 503,
};

export type AdminStats = {
  totalLeads: number;
  newToday: number;
  activeLeads: number;
  /**
   * Distinct people who opened the site TODAY, where "today" is the UAE
   * calendar day — the same boundary `newToday` uses for leads, so the two
   * daily figures on the Overview always agree about when a day starts.
   *
   * This was a rolling 7×24h count called `visitorsThisWeek`. Renamed rather
   * than quietly re-scoped: a stat whose name says "week" while it counts a day
   * is exactly how a dashboard ends up being read wrong, and the old name is
   * now a compile error everywhere it was used.
   */
  visitorsToday: number;
  whatsappClicks: number;
  /** Times a visitor pressed "Call Now" on the landing page. */
  callClicks: number;
  /** Valuation forms started but never submitted, and not since converted. */
  incompleteForms: number;
  /**
   * How many leads sit at each pipeline status.
   *
   * Every status in LEAD_PIPELINE is present, including the ones on zero — a
   * stage that vanishes when empty makes the pipeline look shorter than it is,
   * and "no leads at Inspected" is itself the thing worth noticing.
   */
  byStatus: Record<string, number>;
};

/**
 * The Overview counters.
 *
 * Leads are read ONCE, as `(status, created_at)` rows, and every lead figure is
 * tallied from that in memory. It used to run three separate `count` queries
 * over the same table — total, new-today, and active — and adding a count per
 * pipeline status would have taken that to eleven round trips to answer
 * questions one pass over the same rows already answers.
 *
 * At 300ms per round trip to this project's database, that is the difference
 * between a dashboard that opens and one that hesitates.
 */
export async function fetchAdminStats(): Promise<QueryResult<AdminStats>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = getSupabaseAdmin();
  // "Today" means the UAE calendar day, not the server's (likely UTC) local day -
  // the server may run anywhere (e.g. Vercel defaults to UTC), but the business is UAE-based.
  const startOfToday = startOfUaeDayUtc();

  const [leadRows, visitorRows, whatsapp, callClicks, incomplete] = await Promise.all([
    supabase.from("leads").select("status, created_at").limit(SESSION_SCAN_CAP),
    // Distinct people, not page loads — see countDistinctSessions. Bounded by
    // the same UAE day start as `newToday` below, so the figure returns to zero
    // at UAE midnight instead of dragging the previous six days along with it.
    supabase
      .from("events")
      .select("session_id")
      .eq("type", "page_view")
      .gte("created_at", startOfToday.toISOString())
      .limit(SESSION_SCAN_CAP),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("type", "whatsapp_click"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("type", "call_click"),
    // Abandoned forms still waiting on someone. Converted rows are excluded, so
    // this only ever counts people who are not already leads.
    supabase.from("partial_leads").select("id", { count: "exact", head: true }).is("converted_lead_id", null),
  ]);

  const leads = (leadRows.data ?? []) as Array<{ status: string; created_at: string }>;

  // Seeded with every pipeline stage at zero, so an empty stage still appears.
  const byStatus: Record<string, number> = {};
  for (const status of LEAD_PIPELINE) byStatus[status] = 0;

  let newToday = 0;
  const todayMs = startOfToday.getTime();

  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
    if (new Date(lead.created_at).getTime() >= todayMs) newToday += 1;
  }

  // "Active" = still being worked. Excludes 'new' (nobody has picked it up),
  // 'deal' (bought — it is a car in Inventory now) and 'closed' (finished).
  const activeLeads =
    byStatus.pending +
    byStatus.contacted +
    byStatus.inspection_scheduled +
    byStatus.inspected +
    byStatus.negotiating;

  return {
    ok: true,
    data: {
      totalLeads: leads.length,
      newToday,
      activeLeads,
      byStatus,
      visitorsToday: countDistinctSessions((visitorRows.data ?? []) as SessionRow[]),
      whatsappClicks: whatsapp.count ?? 0,
      // `?? 0` matters here beyond tidiness: until migration 0018 is applied,
      // 'call_click' is not a member of the `event_type` enum, so Postgres
      // errors on the comparison and returns a null count rather than zero.
      // Falling back keeps the card reading 0 instead of blank while the
      // migration is outstanding.
      callClicks: callClicks.count ?? 0,
      incompleteForms: incomplete.count ?? 0,
    },
  };
}

export type ChartPoint = { day: string; visitors?: number; submissions?: number };

function countByDay(
  rows: { created_at: string }[],
  days: { key: string; label: string }[],
  keyOf: (d: Date) => string | null,
) {
  const counts = new Map(days.map((d) => [d.key, 0]));
  for (const row of rows) {
    const key = keyOf(new Date(row.created_at));
    if (key === null) continue;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ day: d.label, count: counts.get(d.key) ?? 0 }));
}


/** The two 7-day series behind the Overview charts. */
export async function fetchAdminCharts(): Promise<
  QueryResult<{ visitors: ChartPoint[]; submissions: ChartPoint[] }>
> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const days = buildLastSevenUaeDays();
  // The exact instant the oldest bucket opens. Deriving this from the day KEY
  // and appending "T00:00:00.000Z" fetched an extra 20 hours of rows on every
  // request that could never match a bucket.
  const rangeStart = days[0].startsAt.toISOString();

  const supabase = getSupabaseAdmin();
  const [visitorsRes, leadsRes] = await Promise.all([
    supabase
      .from("events")
      .select("created_at, session_id")
      .eq("type", "page_view")
      .gte("created_at", rangeStart)
      .limit(SESSION_SCAN_CAP),
    supabase.from("leads").select("created_at").gte("created_at", rangeStart),
  ]);

  if (visitorsRes.error || leadsRes.error) {
    return {
      ok: false,
      message: visitorsRes.error?.message ?? leadsRes.error?.message ?? "Query failed.",
      status: 500,
    };
  }

  return {
    ok: true,
    data: {
      visitors: countDistinctSessionsByDay(
        (visitorsRes.data ?? []) as DatedSessionRow[],
        days,
        uaeDayKey,
      ).map((d) => ({ day: d.day, visitors: d.count })),
      submissions: countByDay(leadsRes.data ?? [], days, uaeDayKey).map((d) => ({ day: d.day, submissions: d.count })),
    },
  };
}

const INVENTORY_SELECT = `
  id, lead_id, make, model, trim, year, mileage_km,
  purchase_price_aed, purchased_at, status, sale_price_aed, sold_at, notes,
  commission_entries ( profit_aed, rate, commission_aed, sold_at ),
  leads ( phone_verified )
`;

/** Cars the business has bought and owns. `leadId` narrows to one lead's stock. */
export async function fetchInventory(leadId?: string | null): Promise<QueryResult<{ items: InventoryItem[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  let query = getSupabaseAdmin().from("inventory").select(INVENTORY_SELECT).order("purchased_at", { ascending: false });
  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error) return { ok: false, message: error.message, status: 500 };

  return { ok: true, data: { items: ((data ?? []) as unknown as DbInventory[]).map(mapDbInventory) } };
}

/** Valuation forms started but never submitted. Converted rows are excluded. */
export async function fetchPartialLeads(): Promise<QueryResult<{ partialLeads: PartialLead[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const { data, error } = await getSupabaseAdmin()
    .from("partial_leads")
    .select(PARTIAL_LEAD_COLUMNS)
    // Only unconverted rows are ever returned, so someone who later completed
    // the form disappears from here automatically and is never shown in both
    // places.
    .is("converted_lead_id", null)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message, status: 500 };

  return { ok: true, data: { partialLeads: (data ?? []) as unknown as PartialLead[] } };
}

export type BlockedNumberRow = {
  phone_e164: string;
  reason: string;
  note: string | null;
  full_name: string | null;
  source_lead_id: string | null;
  created_at: string;
};

export type SuspiciousRow = { phone_e164: string; attempts: number; last_attempt: string };

/**
 * A number that was turned away by an OTP guard in the last 24 hours.
 *
 * "Too many verification requests" covers five different refusals — the hard
 * blocklist, the global spend cap, the per-phone cap, the per-IP cap and the
 * unverified streak — and until now only the last one appeared anywhere in the
 * admin. Someone hitting the per-phone cap was refused silently, so the
 * question "who is being turned away today?" had no answer on any screen.
 *
 * `refusedSends` is the honest headline: it counts the times the server
 * actually said no, straight from the attempt log, rather than inferring it.
 */
export type LimitHitRow = {
  phone_e164: string;
  /** OTP messages actually sent in the window. */
  sends: number;
  /** Of those, how many were never verified. */
  unverified: number;
  /** Send requests the guards refused outright. */
  refusedSends: number;
  /** Wrong codes entered. */
  failedVerifies: number;
  /** Which ceiling this number is at, if any. */
  reason: "blocklist" | "phone_cap" | "unverified_streak" | "refused" | null;
  lastAttempt: string;
};

export type OtpLimitReport = {
  rows: LimitHitRow[];
  caps: OtpCaps;
};

/** The hard blocklist, plus numbers that tripped an OTP guard in the last 24h. */
export async function fetchBlockedNumbers(): Promise<
  QueryResult<{ blocked: BlockedNumberRow[]; recentSuspicious: SuspiciousRow[]; otpLimits: OtpLimitReport }>
> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = getSupabaseAdmin();

  const { data: blocked, error } = await supabase
    .from("blocked_numbers")
    .select("phone_e164, reason, note, full_name, source_lead_id, created_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message, status: 500 };

  // Numbers that tripped an automated OTP guard in the last 24h but have NOT
  // been permanently blocked. Surfaced separately and never auto-added: a real
  // customer can hit a cap by accident, so promoting to the blocklist stays a
  // deliberate admin action.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let recentSuspicious: SuspiciousRow[] = [];

  // Hoisted so the limit report below can reuse these counts instead of reading
  // the same 24 hours of verification rows a second time.
  const otpByPhone = new Map<string, { attempts: number; verified: number; last: string }>();

  try {
    const { data: recent } = await supabase
      .from("whatsapp_otp_verifications")
      .select("phone_number, created_at, verified_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (recent) {
      const blockedSet = new Set((blocked ?? []).map((b) => b.phone_e164));

      for (const row of recent as Array<{ phone_number: string; created_at: string; verified_at: string | null }>) {
        const entry = otpByPhone.get(row.phone_number) ?? { attempts: 0, verified: 0, last: row.created_at };
        entry.attempts += 1;
        if (row.verified_at) entry.verified += 1;
        if (row.created_at > entry.last) entry.last = row.created_at;
        otpByPhone.set(row.phone_number, entry);
      }

      recentSuspicious = Array.from(otpByPhone.entries())
        // Three or more requests with nothing ever verified is the same signal
        // the send-side guard uses (OTP_UNVERIFIED_STREAK_CAP).
        .filter(([phone, e]) => e.verified === 0 && e.attempts >= 3 && !blockedSet.has(phone))
        .map(([phone, e]) => ({ phone_e164: phone, attempts: e.attempts, last_attempt: e.last }))
        .sort((a, b) => b.attempts - a.attempts);
    }
  } catch {
    // non-fatal — the blocklist itself still renders
  }

  // Who the guards actually turned away, and why.
  //
  // Built from otp_attempts (every send/verify with its outcome) joined against
  // the verification rows, because neither alone answers the question: the
  // attempt log knows a request was refused but not which ceiling it hit, and
  // the verification rows know the counts but never record a refusal — a
  // refused send never creates one.
  const caps = getOtpCaps();
  const blockedPhones = new Set((blocked ?? []).map((b) => b.phone_e164));
  const limitRows = new Map<string, LimitHitRow>();

  try {
    const { data: attempts } = await supabase
      .from("otp_attempts")
      .select("phone_e164, action, success, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    // Seed from the sends/verifications already counted above.
    const sendStats = new Map<string, { sends: number; unverified: number; last: string }>();
    for (const [phone, e] of Array.from(otpByPhone.entries())) {
      sendStats.set(phone, { sends: e.attempts, unverified: e.attempts - e.verified, last: e.last });
    }

    for (const row of (attempts ?? []) as Array<{
      phone_e164: string;
      action: string;
      success: boolean;
      created_at: string;
    }>) {
      const phone = row.phone_e164;
      const stats = sendStats.get(phone);
      const existing =
        limitRows.get(phone) ??
        ({
          phone_e164: phone,
          sends: stats?.sends ?? 0,
          unverified: stats?.unverified ?? 0,
          refusedSends: 0,
          failedVerifies: 0,
          reason: null,
          // Rows arrive newest-first, so the first one seen is the latest.
          lastAttempt: row.created_at,
        } as LimitHitRow);

      if (row.action === "send" && !row.success) existing.refusedSends += 1;
      if (row.action === "verify" && !row.success) existing.failedVerifies += 1;

      limitRows.set(phone, existing);
    }

    for (const row of Array.from(limitRows.values())) {
      // Most specific reason first — "on the blocklist" explains everything
      // else, and a bare "refused" explains nothing on its own.
      if (blockedPhones.has(row.phone_e164)) row.reason = "blocklist";
      else if (row.sends > 0 && row.unverified >= caps.unverified && row.unverified === row.sends)
        row.reason = "unverified_streak";
      else if (row.sends >= caps.phone) row.reason = "phone_cap";
      else if (row.refusedSends > 0) row.reason = "refused";
    }
  } catch {
    // non-fatal — the blocklist itself still renders
  }

  // Only numbers that actually hit something. A number that verified first time
  // is not evidence of anything and would only bury the ones that are.
  const otpLimits: OtpLimitReport = {
    caps,
    rows: Array.from(limitRows.values())
      .filter((r) => r.reason !== null)
      .sort((a, b) => b.refusedSends - a.refusedSends || b.sends - a.sends),
  };

  return {
    ok: true,
    data: { blocked: (blocked ?? []) as BlockedNumberRow[], recentSuspicious, otpLimits },
  };
}

const STATEMENT_SELECT = `
  id, period_month, entry_count, total_profit_aed, total_commission_aed,
  status, issued_at, paid_at, payment_note
`;

/**
 * Every monthly statement, rebuilding the open ones first.
 *
 * Rebuilding on read keeps the current month's total live as cars sell, without
 * a scheduled job. build_commission_statement() ignores anything already issued
 * or paid, so this can never disturb a settled month.
 */
export async function fetchCommissionStatements(): Promise<QueryResult<{ statements: CommissionStatement[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = getSupabaseAdmin();

  // Only months from the first sale onwards can hold anything.
  const { data: earliest } = await supabase
    .from("commission_entries")
    .select("sold_at")
    .order("sold_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const months = monthsToBuild(earliest?.sold_at ?? null);

  // Sequential and oldest-first on purpose: each call locks its statement row,
  // and the ordering matters now that unbilled entries carry forward — the
  // earliest OPEN month must get first claim on them.
  for (const month of months) {
    const { error } = await supabase.rpc("build_commission_statement", { p_month: month });
    if (error) return { ok: false, message: error.message, status: 500 };
  }

  // Every month up to today may already be settled — which leaves a sale made
  // after its month was paid with nowhere to go. Open the following month so
  // the money always has a home.
  //
  // Stops the moment an attempt fails to claim anything. Without that guard,
  // a database still running the pre-0017 function (which only accepts sales
  // made inside its own month) would never adopt the straggler, and this would
  // create an empty statement on every single page load.
  let landing = months[months.length - 1];
  let previousOrphans = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { count } = await supabase
      .from("commission_entries")
      .select("id", { count: "exact", head: true })
      .is("statement_id", null);

    const orphans = count ?? 0;
    if (orphans === 0) break;

    if (orphans >= previousOrphans) {
      // The last attempt changed nothing, so another will not either.
      console.warn(
        `[admin/commission] ${orphans} commission entr${orphans === 1 ? "y is" : "ies are"} unbilled and could not be carried forward. ` +
          `This means migration 0017_commission_carry_forward.sql has not been applied — until it is, sales made after their own month was settled stay invisible.`,
      );
      break;
    }

    previousOrphans = orphans;
    landing = nextMonth(landing);
    const { error } = await supabase.rpc("build_commission_statement", { p_month: landing });
    if (error) return { ok: false, message: error.message, status: 500 };
  }

  const [{ data, error }, { data: entryRows }] = await Promise.all([
    supabase.from("commission_statements").select(STATEMENT_SELECT).order("period_month", { ascending: false }),
    supabase.from("commission_entries").select("statement_id, sold_at").not("statement_id", "is", null),
  ]);

  if (error) return { ok: false, message: error.message, status: 500 };

  // How many of each statement's sales happened in an earlier month, so the UI
  // can say why a month bills more cars than were sold in it.
  const carried = new Map<string, number>();
  const byMonth = new Map(((data ?? []) as unknown as DbStatement[]).map((s) => [s.id, s.period_month]));
  for (const row of (entryRows ?? []) as { statement_id: string; sold_at: string }[]) {
    const month = byMonth.get(row.statement_id);
    if (month && isCarriedForward(row.sold_at, month)) {
      carried.set(row.statement_id, (carried.get(row.statement_id) ?? 0) + 1);
    }
  }

  const statements = ((data ?? []) as unknown as DbStatement[]).map((r) => mapDbStatement(r, carried.get(r.id) ?? 0));

  // A month with no sales has nothing to bill and only adds noise.
  return { ok: true, data: { statements: statements.filter((s) => s.entryCount > 0) } };
}
