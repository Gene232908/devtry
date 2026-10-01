import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getOtpCaps, type OtpCaps } from "@/lib/server/otp-guards";
import { LEAD_PIPELINE } from "@/lib/format";
import { mapDbInventory, type DbInventory, type InventoryItem } from "@/lib/admin/inventory";
import { PARTIAL_LEAD_COLUMNS, PARTIAL_LEAD_COLUMNS_LEGACY, type PartialLead } from "@/lib/admin/partial-lead";
import type { Manager, Settings } from "@/lib/admin/settings-schema";
import {
  buildLastSevenUaeDays,
  buildUaeDayRange,
  endOfUaeDayUtc,
  startOfUaeDayUtc,
  uaeDayKey,
  uaeDayStringToUtc,
} from "@/lib/uae-time";
import {
  countDistinctSessions,
  countDistinctSessionsByDay,
  SESSION_SCAN_CAP,
  type DatedSessionRow,
  type SessionRow,
} from "@/lib/admin/visitor-count";
import {
  canViewCommissionFinancialReview,
  isCarriedForward,
  mapDbStatement,
  monthsToBuild,
  nextMonth,
  type CommissionStatement,
  type DbStatement,
  type DbStaffCommissionEntry,
  type DbStaffCommissionPayment,
  type DbStaffReferralIncentive,
  type StaffCommission,
  type StaffCommissionEntry,
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

export type DateRangeParam = {
  from?: string;
  to?: string;
};

export function resolveDateRange(range?: DateRangeParam) {
  if (!range?.from || !range?.to) return null;
  let fromUtc = range.from.includes("T") ? new Date(range.from) : uaeDayStringToUtc(range.from);
  let toUtc = range.to.includes("T") ? new Date(range.to) : endOfUaeDayUtc(range.to);
  if (isNaN(fromUtc.getTime()) || isNaN(toUtc.getTime())) return null;
  if (fromUtc.getTime() > toUtc.getTime()) {
    const temp = fromUtc;
    fromUtc = toUtc;
    toUtc = temp;
  }
  const fromKey = uaeDayKey(fromUtc);
  const toKey = uaeDayKey(toUtc);
  return { fromUtc, toUtc, fromKey, toKey };
}

export type AdminStats = {
  totalLeads: number;
  newToday: number;
  activeLeads: number;
  /**
   * Distinct people who opened the site TODAY (or during the active date range),
   * where "today" is the UAE calendar day.
   */
  visitorsToday: number;
  whatsappClicks: number;
  /** Times a visitor pressed "Call Now" on the landing page. */
  callClicks: number;
  /** Valuation forms started but never submitted, and not since converted. */
  incompleteForms: number;
  /**
   * How many leads sit at each pipeline status.
   */
  byStatus: Record<string, number>;
};

/**
 * The Overview counters.
 */
export async function fetchAdminStats(
  identity?: { role: string; userId: string },
  dateRange?: DateRangeParam,
): Promise<QueryResult<AdminStats>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = getSupabaseAdmin();
  const resolved = resolveDateRange(dateRange);

  // "Today" means the UAE calendar day, not the server's (likely UTC) local day -
  // the server may run anywhere (e.g. Vercel defaults to UTC), but the business is UAE-based.
  const startOfToday = startOfUaeDayUtc();

  let leadsQuery = supabase.from("leads").select("status, created_at").limit(SESSION_SCAN_CAP);
  let partialLeadsQuery = supabase
    .from("partial_leads")
    .select("id", { count: "exact", head: true })
    .is("converted_lead_id", null)
    .is("archived_at", null);

  if (resolved) {
    leadsQuery = leadsQuery
      .gte("created_at", resolved.fromUtc.toISOString())
      .lte("created_at", resolved.toUtc.toISOString());
    partialLeadsQuery = partialLeadsQuery
      .gte("created_at", resolved.fromUtc.toISOString())
      .lte("created_at", resolved.toUtc.toISOString());
  }

  if (identity?.role === "call_center") {
    leadsQuery = leadsQuery.eq("call_center_id", identity.userId);
    partialLeadsQuery = partialLeadsQuery.eq("call_center_id", identity.userId);
  } else if (identity?.role === "purchaser") {
    leadsQuery = leadsQuery.eq("purchaser_id", identity.userId);
    partialLeadsQuery = partialLeadsQuery.eq("purchaser_id", identity.userId);
  }

  let visitorsQuery = supabase
    .from("events")
    .select("session_id")
    .eq("type", "page_view")
    .limit(SESSION_SCAN_CAP);

  let whatsappQuery = supabase.from("events").select("id", { count: "exact", head: true }).eq("type", "whatsapp_click");
  let callClicksQuery = supabase.from("events").select("id", { count: "exact", head: true }).eq("type", "call_click");

  if (resolved) {
    visitorsQuery = visitorsQuery
      .gte("created_at", resolved.fromUtc.toISOString())
      .lte("created_at", resolved.toUtc.toISOString());
    whatsappQuery = whatsappQuery
      .gte("created_at", resolved.fromUtc.toISOString())
      .lte("created_at", resolved.toUtc.toISOString());
    callClicksQuery = callClicksQuery
      .gte("created_at", resolved.fromUtc.toISOString())
      .lte("created_at", resolved.toUtc.toISOString());
  } else {
    visitorsQuery = visitorsQuery.gte("created_at", startOfToday.toISOString());
  }

  const [leadRows, visitorRows, whatsapp, callClicks, incomplete] = await Promise.all([
    leadsQuery,
    visitorsQuery,
    whatsappQuery,
    callClicksQuery,
    partialLeadsQuery,
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

/** The series behind the Overview charts (7-day default or custom range). */
export async function fetchAdminCharts(
  identity?: { role: string; userId: string },
  dateRange?: DateRangeParam,
): Promise<QueryResult<{ visitors: ChartPoint[]; submissions: ChartPoint[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const resolved = resolveDateRange(dateRange);
  const days = resolved
    ? buildUaeDayRange(resolved.fromKey, resolved.toKey)
    : buildLastSevenUaeDays();

  if (days.length === 0) {
    return { ok: true, data: { visitors: [], submissions: [] } };
  }

  const rangeStart = days[0].startsAt.toISOString();
  const rangeEnd = endOfUaeDayUtc(days[days.length - 1].key).toISOString();

  const supabase = getSupabaseAdmin();
  let leadsQuery = supabase
    .from("leads")
    .select("created_at")
    .gte("created_at", rangeStart)
    .lte("created_at", rangeEnd);

  if (identity?.role === "call_center") {
    leadsQuery = leadsQuery.eq("call_center_id", identity.userId);
  } else if (identity?.role === "purchaser") {
    leadsQuery = leadsQuery.eq("purchaser_id", identity.userId);
  }

  const [visitorsRes, leadsRes] = await Promise.all([
    supabase
      .from("events")
      .select("created_at, session_id")
      .eq("type", "page_view")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd)
      .limit(SESSION_SCAN_CAP),
    leadsQuery,
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
  id, lead_id, make, model, trim, year, mileage_km, chassis_number,
  purchase_price_aed, purchased_at, status, sale_price_aed, sold_at, notes,
  expense_total_aed, net_profit_aed, financial_status, financial_review_version,
  commission_entries ( profit_aed, rate, commission_aed, sold_at ),
  leads ( phone_verified, call_center_id, purchaser_id, inquiry_type )
`;
const INVENTORY_SELECT_LEGACY = `
  id, lead_id, make, model, trim, year, mileage_km,
  purchase_price_aed, purchased_at, status, sale_price_aed, sold_at, notes,
  commission_entries ( profit_aed, rate, commission_aed, sold_at ),
  leads ( phone_verified, call_center_id, purchaser_id )
`;

/** Cars the business has bought and owns. `leadId` narrows to one lead's stock. */
export async function fetchInventory(
  leadId?: string | null,
  identity?: { role: string; userId: string },
): Promise<QueryResult<{ items: InventoryItem[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  let query = getSupabaseAdmin().from("inventory").select(INVENTORY_SELECT).order("purchased_at", { ascending: false });
  if (leadId) query = query.eq("lead_id", leadId);

  const primaryResult = await query;
  let data = primaryResult.data as unknown[] | null;
  let error = primaryResult.error;
  if (error && /chassis_number|inquiry_type|expense_total_aed|net_profit_aed|financial_status|financial_review_version/i.test(error.message ?? "")) {
    let fallback = getSupabaseAdmin().from("inventory").select(INVENTORY_SELECT_LEGACY).order("purchased_at", { ascending: false });
    if (leadId) fallback = fallback.eq("lead_id", leadId);
    const legacyResult = await fallback;
    data = legacyResult.data as unknown[] | null;
    error = legacyResult.error;
  }
  if (error) return { ok: false, message: error.message, status: 500 };

  const items = ((data ?? []) as unknown as DbInventory[]).map(mapDbInventory);
  const inventoryIds = items.map((item) => item.id);
  const { data: staffCommissionRows, error: staffCommissionError } = inventoryIds.length
    ? await getSupabaseAdmin()
      .from("staff_commission_entries")
      .select("inventory_id, role, commission_aed")
      .in("inventory_id", inventoryIds)
      .is("paid_at", null)
    : { data: [], error: null };

  // An old database without migration 0025 can still list inventory. Newer
  // databases use the frozen rows instead of re-calculating staff pay in UI.
  if (staffCommissionError && !/staff_commission_entries/.test(staffCommissionError.message ?? "")) {
    return { ok: false, message: staffCommissionError.message, status: 500 };
  }
  const staffCommissionByInventory = new Map<string, { callCenter: number | null; purchaser: number | null }>();
  for (const row of (staffCommissionRows ?? []) as { inventory_id: string; role: string; commission_aed: number | string }[]) {
    const current = staffCommissionByInventory.get(row.inventory_id) ?? { callCenter: null, purchaser: null };
    if (row.role === "call_center") current.callCenter = Number(row.commission_aed);
    if (row.role === "purchaser") current.purchaser = Number(row.commission_aed);
    staffCommissionByInventory.set(row.inventory_id, current);
  }

  const scopedItems = items.map((item) => {
    const staffCommission = staffCommissionByInventory.get(item.id);
    const next = {
      ...item,
      callCenterCommissionAed: staffCommission?.callCenter ?? null,
      purchaserCommissionAed: staffCommission?.purchaser ?? null,
    };
    // Purchasers can see their own 10% ledger amount, but never the developer
    // amount or another staff member's commission through the page payload.
    if (identity?.role === "purchaser") {
      return {
        ...next,
        // Assignment UUIDs are needed only while this server function scopes
        // the result. Do not serialize either staff identifier to a Purchaser.
        callCenterId: null,
        purchaserId: null,
        callCenterCommissionAed: null,
        purchaserCommissionAed: item.purchaserId === identity.userId ? next.purchaserCommissionAed : null,
        commission: next.commission ? { ...next.commission, rate: 0, commissionAed: 0 } : null,
      };
    }
    // Call Centre receives the financial vehicle summary for its assigned lead
    // through the record, but never another role's ledger amount or the
    // developer's commission through this server payload.
    if (identity?.role === "call_center") {
      return {
        ...next,
        callCenterId: null,
        purchaserId: null,
        callCenterCommissionAed: item.callCenterId === identity.userId ? next.callCenterCommissionAed : null,
        purchaserCommissionAed: null,
        commission: next.commission ? { ...next.commission, rate: 0, commissionAed: 0 } : null,
      };
    }
    return next;
  });

  return { ok: true, data: { items: scopedItems } };
}

/** Valuation forms started but never submitted. Converted rows are excluded. */
export async function fetchPartialLeads(identity?: { role: string; userId: string }): Promise<QueryResult<{ partialLeads: PartialLead[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  // Purchasers only receive real leads after a CSR confirms the customer and
  // books an inspection. An incomplete form is unverified recovery work.
  if (identity?.role === "purchaser") return { ok: true, data: { partialLeads: [] } };

  const createQuery = (columns: string) => {
    let query = getSupabaseAdmin()
      .from("partial_leads")
      .select(columns)
      // Only unconverted rows are ever returned, so someone who later completed
      // the form disappears from here automatically and is never shown in both
      // places.
      .is("converted_lead_id", null)
      .is("archived_at", null);
    if (identity?.role === "call_center") query = query.eq("call_center_id", identity.userId);
    return query.order("created_at", { ascending: false });
  };

  let { data, error } = await createQuery(PARTIAL_LEAD_COLUMNS);
  if (error && /inquiry_type|scrap_condition|scrap_asking_price_aed|mileage_value|mileage_unit/i.test(error.message ?? "")) {
    ({ data, error } = await createQuery(PARTIAL_LEAD_COLUMNS_LEGACY));
  }

  if (error) return { ok: false, message: error.message, status: 500 };

  return { ok: true, data: { partialLeads: (data ?? []) as unknown as PartialLead[] } };
}

/** Single incomplete valuation form with activities. */
export async function fetchPartialLead(
  id: string,
  identity?: { role: string; userId: string },
): Promise<QueryResult<{ partialLead: PartialLead }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (identity?.role === "purchaser") return { ok: false, message: "Not found.", status: 404 };

  const supabase = getSupabaseAdmin();
  const createQuery = (columns: string) => {
    let query = supabase
      .from("partial_leads")
      .select(columns)
      .eq("id", id)
      .is("converted_lead_id", null)
      .is("archived_at", null);
    if (identity?.role === "call_center") query = query.eq("call_center_id", identity.userId);
    return query.maybeSingle();
  };

  let { data, error } = await createQuery(PARTIAL_LEAD_COLUMNS);
  if (error && /inquiry_type|scrap_condition|scrap_asking_price_aed|mileage_value|mileage_unit/i.test(error.message ?? "")) {
    ({ data, error } = await createQuery(PARTIAL_LEAD_COLUMNS_LEGACY));
  }

  if (error) return { ok: false, message: error.message, status: 500 };
  if (!data) return { ok: false, message: "Not found.", status: 404 };

  let activities: Array<{ id: string; type: "note_updated" | "status_changed" | "assigned"; meta: { from?: string; to?: string }; created_at: string }> = [];
  try {
    const { data: actData, error: actError } = await supabase
      .from("partial_lead_events")
      .select("id, type, meta, created_at")
      .eq("partial_lead_id", id)
      .order("created_at", { ascending: false });
    if (!actError && actData) {
      activities = actData as typeof activities;
    }
  } catch {
    // Optional audit table
  }

  return { ok: true, data: { partialLead: { ...(data as unknown as PartialLead), activities } } };
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

  // Both answers are needed before any month can be built, and neither depends
  // on the other, so they share one round trip rather than taking two.
  const [{ data: earliest }, { data: existingRows }] = await Promise.all([
    // Only months from the first sale onwards can hold anything.
    supabase
      .from("commission_entries")
      .select("sold_at")
      .order("sold_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Which months are already settled — see the loop below.
    supabase.from("commission_statements").select("period_month, status"),
  ]);

  const months = monthsToBuild(earliest?.sold_at ?? null);

  // A statement that is issued or paid is locked: build_commission_statement()
  // takes its row lock, sees `status <> 'draft'`, and returns it untouched
  // (migration 0017, lines 43-49). Calling it for such a month is a round trip
  // that is guaranteed to change nothing.
  //
  // That was costing a request per settled month on EVERY view of this page,
  // sequentially — one month of history today, but this list only grows, and at
  // ~110ms a call a year of trading would have put a second and a half of dead
  // waiting in front of the page. Skipping them is not a behaviour change; it
  // is declining to ask a question whose answer is already known.
  const settled = new Set(
    ((existingRows ?? []) as { period_month: string; status: string }[])
      .filter((s) => s.status !== "draft")
      .map((s) => s.period_month),
  );

  // Still sequential and still oldest-first for the months that DO get built:
  // each call takes its statement's row lock, and unbilled entries carry
  // forward, so the earliest OPEN month must get first claim on them.
  for (const month of months) {
    if (settled.has(month)) continue;
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

// ---------------------------------------------------------------------------
// Staff (Agent / Purchaser) commission
// ---------------------------------------------------------------------------

/**
 * Agent and purchaser commission, split by role, for the Commission page.
 *
 * Unlike the developer's ledger (admin-only), an operational role reads their
 * own figures here — `identity` narrows the query to just them. An owner gets
 * every call centre and purchaser account, including ones with nothing owed
 * yet, so the page reads as a staff roster rather than only whoever happens to
 * have a balance right now.
 *
 * "Owed" means unpaid `staff_commission_entries` rows (migration 0025) — see
 * that migration for why there is no separate monthly record the way the
 * developer's commission has one.
 */
export async function fetchStaffCommission(
  identity: { role: string; userId: string },
): Promise<QueryResult<{ agents: StaffCommission[]; purchasers: StaffCommission[]; referralRecipients: StaffCommission[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = getSupabaseAdmin();
  const isOwner = identity.role === "admin" || identity.role === "manager";
  const canViewFinancialReview = canViewCommissionFinancialReview(identity.role);

  let staffQuery = supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .in("role", ["call_center", "purchaser"])
    .order("created_at", { ascending: true });

  if (!isOwner) staffQuery = staffQuery.eq("id", identity.userId);

  const { data: staffRows, error: staffError } = await staffQuery;
  if (staffError) return { ok: false, message: staffError.message, status: 500 };

  const staff = (staffRows ?? []) as { id: string; display_name: string | null; role: string; created_at: string }[];
  if (staff.length === 0 && !isOwner) return { ok: true, data: { agents: [], purchasers: [], referralRecipients: [] } };

  const staffIds = staff.map((s) => s.id);

  const { data: entryRows, error: entryError } = await supabase
    .from("staff_commission_entries")
    .select("id, staff_id, role, profit_aed, commission_aed, sold_at, paid_at, payment_id, inventory_id")
    .in("staff_id", staffIds)
    .order("sold_at", { ascending: false });

  if (entryError) return { ok: false, message: entryError.message, status: 500 };

  // Referral incentives are additive to ordinary role commission. A deployment
  // before migration 0031 must keep the existing commission screen usable.
  let referralRows: DbStaffReferralIncentive[] = [];
  let referralsQuery = supabase
    .from("staff_referral_incentives")
    .select("id, staff_id, incentive_aed, sold_at, paid_at, payment_id, inventory_id")
    .gt("incentive_aed", 0);
  if (!isOwner) referralsQuery = referralsQuery.eq("staff_id", identity.userId);
  const referralsResult = await referralsQuery;
  if (!referralsResult.error) {
    referralRows = (referralsResult.data ?? []) as unknown as DbStaffReferralIncentive[];
  } else if (!/staff_referral_incentives/.test(referralsResult.error.message ?? "")) {
    return { ok: false, message: referralsResult.error.message, status: 500 };
  }

  const referralStaffIds = Array.from(new Set(referralRows.map((entry) => entry.staff_id)));
  const missingReferralStaffIds = referralStaffIds.filter((id) => !staffIds.includes(id));
  if (missingReferralStaffIds.length > 0 && isOwner) {
    const { data: referralProfiles, error: referralProfilesError } = await supabase
      .from("profiles")
      .select("id, display_name, role, created_at")
      .in("id", missingReferralStaffIds);
    if (referralProfilesError) return { ok: false, message: referralProfilesError.message, status: 500 };
    staff.push(...((referralProfiles ?? []) as { id: string; display_name: string | null; role: string; created_at: string }[]));
  }

  const entries = (entryRows ?? []) as unknown as DbStaffCommissionEntry[];
  const allStaffIds = staff.map((member) => member.id);
  const { data: paymentRows, error: paymentError } = allStaffIds.length > 0
    ? await supabase
      .from("staff_commission_payments")
      .select("id, staff_id, total_aed, entry_count, paid_at, paid_by_name")
      .in("staff_id", allStaffIds)
      .order("paid_at", { ascending: false })
      .limit(250)
    : { data: [] as DbStaffCommissionPayment[], error: null };
  if (paymentError) return { ok: false, message: paymentError.message, status: 500 };

  // Car and customer names for the entries list, fetched separately rather
  // than nested-embedded — same reasoning as mapDbInventory's one-or-array
  // handling: a schema-cache quirk on either relation degrades to "name
  // blank" instead of losing the commission row entirely.
  const inventoryIds = Array.from(new Set([...entries.map((e) => e.inventory_id), ...referralRows.map((e) => e.inventory_id)]));
  type CommissionInventory = { id: string; lead_id: string; make: string; model: string; year: number; sale_price_aed: number | string | null; expense_total_aed: number | string | null; net_profit_aed: number | string | null };
  const { data: invRows, error: inventoryError } = inventoryIds.length
    ? await supabase.from("inventory").select("id, lead_id, make, model, year, sale_price_aed, expense_total_aed, net_profit_aed").in("id", inventoryIds)
    : { data: [] as CommissionInventory[], error: null };
  if (inventoryError) return { ok: false, message: inventoryError.message, status: 500 };

  const invById = new Map(
    ((invRows ?? []) as CommissionInventory[]).map((r) => [
      r.id,
      r,
    ]),
  );

  const leadIds = Array.from(new Set(Array.from(invById.values()).map((r) => r.lead_id)));
  const { data: leadRows } = leadIds.length
    ? await supabase.from("leads").select("id, full_name").in("id", leadIds)
    : { data: [] as { id: string; full_name: string }[] };
  const leadNameById = new Map(((leadRows ?? []) as { id: string; full_name: string }[]).map((r) => [r.id, r.full_name]));

  const financialReviewByInventory = new Map<string, StaffCommissionEntry["financialReview"]>();
  if (canViewFinancialReview && inventoryIds.length > 0) {
    const financialEvents = isOwner
      ? await supabase
        .from("inventory_financial_events")
        .select("inventory_id, action, reason, actor_id, created_at")
        .in("inventory_id", inventoryIds)
        .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (financialEvents.error) return { ok: false, message: financialEvents.error.message, status: 500 };
    const eventActorIds = Array.from(new Set((financialEvents.data ?? []).map((event) => event.actor_id).filter(Boolean)));
    const { data: eventActors, error: eventActorsError } = eventActorIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", eventActorIds)
      : { data: [] as { id: string; display_name: string | null }[], error: null };
    if (eventActorsError) return { ok: false, message: eventActorsError.message, status: 500 };
    const actorNames = new Map((eventActors ?? []).map((profile) => [profile.id, profile.display_name ?? "Staff member"]));
    for (const inventoryId of inventoryIds) {
      const inventory = invById.get(inventoryId);
      financialReviewByInventory.set(inventoryId, {
        salePrice: inventory?.sale_price_aed == null ? null : Number(inventory.sale_price_aed),
        expenses: Number(inventory?.expense_total_aed ?? 0),
        netProfit: inventory?.net_profit_aed == null ? null : Number(inventory.net_profit_aed),
        margin: inventory?.sale_price_aed && inventory?.net_profit_aed != null
          ? (Number(inventory.net_profit_aed) / Number(inventory.sale_price_aed)) * 100
          : null,
        corrections: (financialEvents.data ?? [])
          .filter((event) => event.inventory_id === inventoryId && event.action === "financial_review_reopened")
          .map((event) => ({ reason: event.reason ?? "No reason provided", actorName: actorNames.get(event.actor_id) ?? "Staff member", at: event.created_at })),
      });
    }
  }

  type CombinedEntry = (DbStaffCommissionEntry & { kind: "role_commission" }) | (DbStaffReferralIncentive & { kind: "referral_incentive" });
  const entriesByStaff = new Map<string, CombinedEntry[]>();
  for (const e of entries) {
    const entry = { ...e, kind: "role_commission" as const };
    const list = entriesByStaff.get(entry.staff_id);
    if (list) list.push(entry);
    else entriesByStaff.set(entry.staff_id, [entry]);
  }
  for (const e of referralRows) {
    const entry = { ...e, kind: "referral_incentive" as const };
    const list = entriesByStaff.get(entry.staff_id);
    if (list) list.push(entry);
    else entriesByStaff.set(entry.staff_id, [entry]);
  }

  const paymentsByStaff = new Map<string, DbStaffCommissionPayment[]>();
  for (const payment of (paymentRows ?? []) as unknown as DbStaffCommissionPayment[]) {
    const list = paymentsByStaff.get(payment.staff_id);
    if (list) list.push(payment);
    else paymentsByStaff.set(payment.staff_id, [payment]);
  }

  const agents: StaffCommission[] = [];
  const purchasers: StaffCommission[] = [];
  const referralRecipients: StaffCommission[] = [];
  const redactAgentProfit = !isOwner && identity.role === "call_center";

  for (const s of staff) {
    const own = entriesByStaff.get(s.id) ?? [];
    const unpaid = own.filter((e) => e.paid_at === null);

    const mapEntry = (entry: CombinedEntry): StaffCommissionEntry => {
      const inv = invById.get(entry.inventory_id);
      return {
        id: entry.id,
        leadName: (inv ? leadNameById.get(inv.lead_id) : null) ?? "—",
        carDetails: inv ? `${inv.year} ${inv.make} ${inv.model}`.trim() : "—",
        soldAt: entry.sold_at,
        kind: entry.kind,
        profit: redactAgentProfit || entry.kind !== "role_commission" ? null : Number(entry.profit_aed),
        commission: entry.kind === "role_commission" ? Number(entry.commission_aed) : Number(entry.incentive_aed),
        ...(canViewFinancialReview && entry.kind === "role_commission" ? { financialReview: financialReviewByInventory.get(entry.inventory_id) } : {}),
      };
    };
    const paymentHistory = (paymentsByStaff.get(s.id) ?? []).map((payment) => ({
      id: payment.id,
      totalAmount: Number(payment.total_aed),
      entryCount: Number(payment.entry_count),
      paidAt: payment.paid_at,
      paidByName: payment.paid_by_name ?? "Recorded before payment history",
      entries: own.filter((entry) => entry.payment_id === payment.id).map(mapEntry),
    }));

    const paidTimestamps = own.map((e) => e.paid_at).filter((t): t is string => t !== null);
    const latestPaidAt = paidTimestamps.length > 0 ? paidTimestamps.sort()[paidTimestamps.length - 1] : null;

    const result: StaffCommission = {
      id: s.id,
      displayName: s.display_name ?? s.id,
      role: s.role as StaffCommission["role"],
      totalCarsSold: unpaid.filter((e) => e.kind === "role_commission").length,
      totalProfit: redactAgentProfit ? 0 : unpaid.reduce((n, e) => n + (e.kind === "role_commission" ? Number(e.profit_aed) : 0), 0),
      totalCommission: unpaid.reduce((n, e) => n + (e.kind === "role_commission" ? Number(e.commission_aed) : Number(e.incentive_aed)), 0),
      isPaidThisMonth: unpaid.length === 0,
      paidAt: latestPaidAt,
      entries: unpaid.map(mapEntry),
      paymentHistory,
    };

    if (s.role === "call_center") agents.push(result);
    else if (s.role === "purchaser") purchasers.push(result);
    if (own.some((entry) => entry.kind === "referral_incentive")) referralRecipients.push(result);
  }

  return { ok: true, data: { agents, purchasers, referralRecipients } };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Business settings plus the staff list, for the Settings screen's first paint.
 *
 * Reading is staff-wide (settings_staff_select); the admin-only restriction
 * applies to writing and is enforced in the PATCH route.
 */
export async function fetchSettings(): Promise<QueryResult<{ settings: Settings; managers: Manager[] }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = getSupabaseAdmin();
  const [settingsRes, profilesRes] = await Promise.all([
    supabase
      .from("settings")
      // `buy_a_car_enabled` is not read: nothing consumes it, and the public
      // "Buy a Car — Coming Soon" button is hard-coded. See settings-schema.ts.
      .select("whatsapp_number, call_number, notify_email, visible_stats, referral_incentive_aed")
      .eq("id", 1)
      .single(),
    supabase.from("profiles").select("id, email, role, display_name").order("created_at", { ascending: true }),
  ]);

  // The manual referral feature is additive. Keep Settings readable until its
  // migration is applied instead of breaking the whole page on the new column.
  let settingsData = settingsRes.data;
  let settingsError = settingsRes.error;
  if (settingsError && /referral_incentive_aed/.test(settingsError.message ?? "")) {
    const fallback = await supabase
      .from("settings")
      .select("whatsapp_number, call_number, notify_email, visible_stats")
      .eq("id", 1)
      .single();
    settingsData = fallback.data as typeof settingsData;
    settingsError = fallback.error;
  }
  if (settingsError) return { ok: false, message: settingsError.message, status: 500 };

  const row = settingsData as {
    whatsapp_number: string | null;
    call_number: string | null;
    notify_email: string | null;
    visible_stats: string[] | null;
  };

  const managers: Manager[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id as string,
    email: (p.email as string | null) ?? "",
    role: p.role as string,
    displayName: (p.display_name as string | null) ?? undefined,
  }));

  return {
    ok: true,
    data: {
      settings: {
        whatsappNumber: row.whatsapp_number ?? "",
        callNumber: row.call_number ?? "",
      notifyEmail: row.notify_email ?? "",
      referralIncentiveAed: Number((row as { referral_incentive_aed?: number | string | null }).referral_incentive_aed ?? 0),
        visibleStats: row.visible_stats ?? [],
      },
      managers,
    },
  };
}
