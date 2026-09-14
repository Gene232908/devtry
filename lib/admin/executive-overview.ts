import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  buildUaeDayRange,
  endOfUaeDayUtc,
  startOfUaeDayUtc,
  uaeDayKey,
  uaeDayStringToUtc,
} from "@/lib/uae-time";

export type OverviewRange = { from: string; to: string };

export type ExecutiveOverview = {
  financial: {
    revenue: number;
    grossProfit: number;
    carsSold: number;
    staffCommissionOwed: number;
    cashInStock: number;
    stockCount: number;
    averageStockDays: number;
  };
  comparison?: Pick<ExecutiveOverview["financial"], "revenue" | "grossProfit" | "carsSold" | "staffCommissionOwed">;
  /** Complete historical data used only when the user explicitly turns on comparison mode. */
  comparisonOverview?: Omit<ExecutiveOverview, "comparisonOverview">;
  pipeline: Array<{ key: string; label: string; value: number; conversion: number | null }>;
  trend: Array<{ day: string; visitors: number; submissions: number; revenue: number; profit: number; sold: number }>;
  inventoryAging: Array<{ label: string; count: number }>;
  staff: Array<{
    id: string;
    name: string;
    role: "call_center" | "purchaser";
    assigned: number;
    handled: number;
    deals: number;
    profit: number;
    commission: number;
  }>;
  pipelineSnapshot: {
    newLeads: number;
    contacted: number;
    inspectionScheduled: number;
    noShow: number;
    underNegotiation: number;
    deals: number;
  };
  alerts: Array<{ key: string; title: string; detail: string; count: number; tone: "warning" | "danger" | "neutral"; href: string }>;
  dataQuality: { score: number; issues: Array<{ label: string; count: number; href: string }> };
};

type DbLead = {
  id: string;
  created_at: string;
  status: string;
  make: string | null;
  model: string | null;
  year: number | null;
  is_duplicate: boolean | null;
  call_center_id: string | null;
  purchaser_id: string | null;
};

type DbInventory = {
  id: string;
  lead_id: string;
  status: string;
  purchase_price_aed: number | string;
  purchased_at: string;
  sale_price_aed: number | string | null;
  sold_at: string | null;
};

type DbEvent = { lead_id: string; type: string; meta: { to?: string } | null; created_at: string };
type DbStaffEntry = { staff_id: string; profit_aed: number | string; commission_aed: number | string; sold_at: string; paid_at: string | null };

const OPEN_STATUSES = new Set(["new", "pending", "contacted", "inspection_scheduled", "inspected", "negotiating"]);
const MAX_ROWS = 5_000;

function fail(message: string): { ok: false; message: string; status: number } {
  return { ok: false, message, status: 500 };
}

function rangeBounds(range: OverviewRange) {
  return {
    from: uaeDayStringToUtc(range.from).toISOString(),
    to: endOfUaeDayUtc(range.to).toISOString(),
  };
}

function inRange(iso: string | null, range: OverviewRange): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  const { from, to } = rangeBounds(range);
  return time >= new Date(from).getTime() && time <= new Date(to).getTime();
}

function percentage(previous: number, current: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function previousPeriod(range: OverviewRange): OverviewRange {
  const from = uaeDayStringToUtc(range.from);
  const to = endOfUaeDayUtc(range.to);
  const length = Math.round((to.getTime() - from.getTime() + 1) / 86_400_000);
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - (length - 1) * 86_400_000);
  return { from: uaeDayKey(previousFrom), to: uaeDayKey(previousTo) };
}

export function defaultOverviewRange(now = new Date()): OverviewRange {
  const today = uaeDayKey(startOfUaeDayUtc(now));
  return { from: today, to: today };
}

function metricSummary(inventory: DbInventory[], staffEntries: DbStaffEntry[], range: OverviewRange) {
  const sales = inventory.filter((item) => item.status === "sold" && inRange(item.sold_at, range));
  return {
    revenue: sales.reduce((total, item) => total + Number(item.sale_price_aed ?? 0), 0),
    grossProfit: sales.reduce(
      (total, item) => total + Math.max(Number(item.sale_price_aed ?? 0) - Number(item.purchase_price_aed), 0),
      0,
    ),
    carsSold: sales.length,
    staffCommissionOwed: staffEntries
      .filter((entry) => entry.paid_at === null && inRange(entry.sold_at, range))
      .reduce((total, entry) => total + Number(entry.commission_aed), 0),
  };
}

/** CEO/Super Admin-only Overview data calculated from existing timestamps and records. */
export async function fetchExecutiveOverview(
  range: OverviewRange,
  comparisonRange?: OverviewRange,
): Promise<{ ok: true; data: ExecutiveOverview } | { ok: false; message: string; status: number }> {
  try {
  if (!isSupabaseConfigured()) return fail("Database is not configured.");

  const supabase = getSupabaseAdmin();
  const bounds = rangeBounds(range);
  const days = buildUaeDayRange(range.from, range.to);
  if (days.length === 0) return fail("Choose a valid date range.");

  const [leadsRes, inventoryRes, eventsRes, visitorsRes, partialRes, staffRes, staffEntriesRes, commissionRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, created_at, status, make, model, year, is_duplicate, call_center_id, purchaser_id")
      .gte("created_at", bounds.from)
      .lte("created_at", bounds.to)
      .limit(MAX_ROWS),
    supabase.from("inventory").select("id, lead_id, status, purchase_price_aed, purchased_at, sale_price_aed, sold_at").limit(MAX_ROWS),
    supabase
      .from("lead_events")
      .select("lead_id, type, meta, created_at")
      .gte("created_at", bounds.from)
      .lte("created_at", bounds.to)
      .limit(MAX_ROWS),
    supabase
      .from("events")
      .select("created_at, session_id")
      .eq("type", "page_view")
      .gte("created_at", bounds.from)
      .lte("created_at", bounds.to)
      .limit(MAX_ROWS),
    supabase
      .from("partial_leads")
      .select("id", { count: "exact", head: true })
      .is("converted_lead_id", null)
      .gte("created_at", bounds.from)
      .lte("created_at", bounds.to),
    supabase.from("profiles").select("id, display_name, role").in("role", ["call_center", "purchaser"]).eq("is_active", true),
    supabase.from("staff_commission_entries").select("staff_id, profit_aed, commission_aed, sold_at, paid_at").limit(MAX_ROWS),
    supabase.from("commission_entries").select("inventory_id").limit(MAX_ROWS),
  ]);

  const failed = [leadsRes, inventoryRes, eventsRes, visitorsRes, partialRes, staffRes, staffEntriesRes, commissionRes].find((result) => result.error);
  if (failed?.error) return fail(failed.error.message);

  const leads = (leadsRes.data ?? []) as DbLead[];
  const inventory = (inventoryRes.data ?? []) as DbInventory[];
  const events = (eventsRes.data ?? []) as DbEvent[];
  const staffEntries = (staffEntriesRes.data ?? []) as DbStaffEntry[];
  const current = metricSummary(inventory, staffEntries, range);
  const compare = comparisonRange ? metricSummary(inventory, staffEntries, comparisonRange) : undefined;

  const stock = inventory.filter((item) => item.status !== "sold");
  const now = Date.now();
  const ageOf = (item: DbInventory) => Math.max(0, Math.floor((now - new Date(item.purchased_at).getTime()) / 86_400_000));
  const stockAges = stock.map(ageOf);
  const inventoryAging = [
    { label: "0-30 days", count: stockAges.filter((daysOld) => daysOld <= 30).length },
    { label: "31-60 days", count: stockAges.filter((daysOld) => daysOld > 30 && daysOld <= 60).length },
    { label: "61-90 days", count: stockAges.filter((daysOld) => daysOld > 60 && daysOld <= 90).length },
    { label: "90+ days", count: stockAges.filter((daysOld) => daysOld > 90).length },
  ];

  const byDay = new Map(days.map((day) => [day.key, { day: day.label, visitors: new Set<string>(), submissions: 0, revenue: 0, profit: 0, sold: 0 }]));
  for (const lead of leads) {
    const bucket = byDay.get(uaeDayKey(new Date(lead.created_at)));
    if (bucket) bucket.submissions += 1;
  }
  for (const visit of visitorsRes.data ?? []) {
    const bucket = byDay.get(uaeDayKey(new Date(visit.created_at)));
    if (bucket) bucket.visitors.add(visit.session_id as string);
  }
  for (const sale of inventory.filter((item) => item.status === "sold" && inRange(item.sold_at, range))) {
    const bucket = byDay.get(uaeDayKey(new Date(sale.sold_at as string)));
    if (bucket) {
      bucket.sold += 1;
      bucket.revenue += Number(sale.sale_price_aed ?? 0);
      bucket.profit += Math.max(Number(sale.sale_price_aed ?? 0) - Number(sale.purchase_price_aed), 0);
    }
  }
  let trend = Array.from(byDay.values()).map((point) => ({ ...point, visitors: point.visitors.size }));

  // When date range is very wide (e.g. All Time spanning 300+ days),
  // aggregate into clean buckets to prevent chart rendering lag.
  if (trend.length > 60) {
    const step = Math.ceil(trend.length / 45);
    const aggregated: typeof trend = [];
    for (let i = 0; i < trend.length; i += step) {
      const chunk = trend.slice(i, i + step);
      const first = chunk[0];
      aggregated.push({
        day: first.day,
        visitors: chunk.reduce((sum, c) => sum + c.visitors, 0),
        submissions: chunk.reduce((sum, c) => sum + c.submissions, 0),
        revenue: chunk.reduce((sum, c) => sum + c.revenue, 0),
        profit: chunk.reduce((sum, c) => sum + c.profit, 0),
        sold: chunk.reduce((sum, c) => sum + c.sold, 0),
      });
    }
    trend = aggregated;
  }

  const uniqueEventLeads = (target: string) =>
    new Set(events.filter((event) => event.type === "status_change" && event.meta?.to === target).map((event) => event.lead_id)).size;
  const funnelValues = [
    { key: "visitors", label: "Visitors", value: new Set((visitorsRes.data ?? []).map((row) => row.session_id as string)).size },
    { key: "submissions", label: "Submissions", value: leads.length },
    { key: "contacted", label: "Contacted", value: uniqueEventLeads("contacted") },
    { key: "inspection_scheduled", label: "Inspection booked", value: uniqueEventLeads("inspection_scheduled") },
    { key: "inspected", label: "Inspected", value: uniqueEventLeads("inspected") },
    { key: "deal", label: "Deals", value: uniqueEventLeads("deal") },
    { key: "purchased", label: "Purchased", value: inventory.filter((item) => inRange(item.purchased_at, range)).length },
    { key: "sold", label: "Sold", value: current.carsSold },
  ];
  const pipeline = funnelValues.map((item, index) => ({
    ...item,
    conversion: index === 0 || funnelValues[index - 1].value === 0 ? null : (item.value / funnelValues[index - 1].value) * 100,
  }));

  const profiles = (staffRes.data ?? []) as Array<{ id: string; display_name: string | null; role: "call_center" | "purchaser" }>;
  const staff = profiles.map((profile) => {
    const field = profile.role === "call_center" ? "call_center_id" : "purchaser_id";
    const assignedLeadIds = new Set(leads.filter((lead) => lead[field] === profile.id).map((lead) => lead.id));
    const handled = new Set(
      events
        .filter((event) => assignedLeadIds.has(event.lead_id) && event.type === "status_change")
        .map((event) => event.lead_id),
    ).size;
    const deals = new Set(
      events
        .filter((event) => assignedLeadIds.has(event.lead_id) && event.type === "status_change" && event.meta?.to === "deal")
        .map((event) => event.lead_id),
    ).size;
    const commissionEntries = staffEntries.filter((entry) => entry.staff_id === profile.id && inRange(entry.sold_at, range));
    return {
      id: profile.id,
      name: profile.display_name ?? "Unnamed staff",
      role: profile.role,
      assigned: assignedLeadIds.size,
      handled,
      deals,
      profit: commissionEntries.reduce((total, entry) => total + Math.max(Number(entry.profit_aed), 0), 0),
      commission: commissionEntries.reduce((total, entry) => total + Number(entry.commission_aed), 0),
    };
  });

  const pipelineSnapshot = {
    newLeads: leads.filter((lead) => lead.status === "new").length,
    contacted: leads.filter((lead) => lead.status === "contacted").length,
    inspectionScheduled: leads.filter((lead) => lead.status === "inspection_scheduled").length,
    noShow: leads.filter((lead) => lead.status === "no_show").length,
    underNegotiation: leads.filter((lead) => lead.status === "negotiating").length,
    deals: leads.filter((lead) => lead.status === "deal").length,
  };

  const latestActivity = new Map<string, number>();
  for (const event of events) latestActivity.set(event.lead_id, Math.max(latestActivity.get(event.lead_id) ?? 0, new Date(event.created_at).getTime()));
  const openLeads = leads.filter((lead) => OPEN_STATUSES.has(lead.status));
  const awaitingFirstContactLeadIds = new Set(
    openLeads
      .filter((lead) => ["new", "pending"].includes(lead.status) && now - new Date(lead.created_at).getTime() > 86_400_000)
      .map((lead) => lead.id),
  );
  const awaitingFirstContact = awaitingFirstContactLeadIds.size;
  // Keep the follow-up buckets mutually exclusive: a lead that has never been
  // contacted belongs only in "Awaiting first contact", not also in "No update".
  const stalledForThreeDays = openLeads.filter(
    (lead) =>
      !awaitingFirstContactLeadIds.has(lead.id) &&
      now - (latestActivity.get(lead.id) ?? new Date(lead.created_at).getTime()) > 3 * 86_400_000,
  ).length;

  const commissionInventoryIds = new Set((commissionRes.data ?? []).map((entry) => entry.inventory_id as string));
  const missingVehicle = leads.filter((lead) => !lead.make || !lead.model || !lead.year).length;
  const duplicate = leads.filter((lead) => lead.is_duplicate === true).length;
  const soldWithoutCommission = inventory.filter(
    (item) => item.status === "sold" && inRange(item.sold_at, range) && !commissionInventoryIds.has(item.id),
  ).length;
  const qualityIssues = [
    { label: "Leads missing car details", count: missingVehicle, href: "/admin/leads?attention=missing-car" },
    { label: "Duplicate leads", count: duplicate, href: "/admin/leads?attention=duplicate" },
    { label: "Sold cars missing commission", count: soldWithoutCommission, href: "/admin/commission?attention=missing-commission" },
  ];
  const issueCount = qualityIssues.reduce((total, item) => total + item.count, 0);

  return {
    ok: true,
    data: {
      financial: {
        ...current,
        cashInStock: stock.reduce((total, item) => total + Number(item.purchase_price_aed), 0),
        stockCount: stock.length,
        averageStockDays: stockAges.length ? Math.round(stockAges.reduce((total, age) => total + age, 0) / stockAges.length) : 0,
      },
      comparison: compare,
      pipeline,
      trend,
      inventoryAging,
      staff,
      pipelineSnapshot,
      alerts: [
        { key: "first-contact", title: "Still waiting for first contact", detail: "New or pending leads waiting for more than 24 hours.", count: awaitingFirstContact, tone: awaitingFirstContact > 0 ? "danger" : "neutral", href: "/admin/leads?attention=first-contact" },
        { key: "stalled", title: "Leads needing a follow-up", detail: "Already-contacted leads with no update for 3 days.", count: stalledForThreeDays, tone: stalledForThreeDays > 0 ? "warning" : "neutral", href: "/admin/leads?attention=stalled" },
        { key: "incomplete", title: "Incomplete forms", detail: "People who started the form but did not finish it.", count: partialRes.count ?? 0, tone: "warning", href: "/admin/incomplete?attention=incomplete" },
        { key: "aging", title: "Cars waiting too long", detail: "Cars still for sale after 90 days.", count: inventoryAging[3].count, tone: inventoryAging[3].count > 0 ? "danger" : "neutral", href: "/admin/inventory?attention=aging" },
      ],
      dataQuality: { score: Math.max(0, 100 - Math.min(100, issueCount * 4)), issues: qualityIssues },
    },
  };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error loading overview.";
    return fail(message);
  }
}

export function comparisonLabel(range?: OverviewRange) {
  if (!range) return "No comparison selected";
  return `${range.from} to ${range.to}`;
}

export function previousMatchingPeriod(range: OverviewRange) {
  return previousPeriod(range);
}

export function financialChange(previous: number, current: number) {
  return percentage(previous, current);
}
