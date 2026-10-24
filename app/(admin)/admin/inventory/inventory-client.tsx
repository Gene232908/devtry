"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShieldAlert, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { SellCarDialog } from "@/components/admin/SellCarDialog";
import { formatNumber } from "@/lib/format";
import { formatUaeMonth, uaeMonthKey } from "@/lib/uae-time";
import {
  INVENTORY_FILTER_OPTIONS,
  INVENTORY_STATUS_LABEL,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/admin/inventory";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { useFreshServerData, useServerState } from "@/lib/admin/use-fresh-server-data";
import { useStaffIdentity } from "@/lib/admin/staff-identity-context";
import { ExportMenu } from "@/components/admin/ExportMenu";
import { exportExcel, exportInventoryPdf, inventoryExportRows } from "@/lib/admin/export-reports";
import { InventoryTable, type InventoryRole } from "@/components/admin/InventoryTable";
import { MobileInventoryList } from "@/components/admin/MobileInventoryList";

// Cars the business has bought and now owns. Stock arrives here automatically
// when a lead is marked as a Deal — there is no "add a car" button, because a
// car with no lead behind it would have no purchase price to be paid against.

// "All" is no longer an option in the list: with checkboxes it is simply
// nothing ticked, and a box labelled "All" sitting alongside the others could
// contradict them.
const STATUS_FILTER_OPTIONS = INVENTORY_FILTER_OPTIONS.map((s) => ({
  value: s,
  label: INVENTORY_STATUS_LABEL[s],
}));

const ROLE_FILTER_OPTIONS: Array<{ value: InventoryRole; label: string }> = [
  { value: "call_center", label: "Call Centre" },
  { value: "purchaser", label: "Purchaser" },
  { value: "developer", label: "Developer" },
];

const ORIGIN_FILTER_OPTIONS = [
  { value: "valuation", label: "Website Valuation" },
  { value: "scrap", label: "Scrap Inquiry" },
] as const;

/**
 * `initialItems` is rendered by the server in `page.tsx`, so this screen paints
 * its real table on first frame instead of mounting empty and then fetching.
 * That removes a whole HTTP round trip that used to go back out through
 * middleware for a second auth check on every visit.
 *
 * Every re-read after that goes through the server too — on arrival, on focus,
 * and after a sale — so this screen has exactly one source of truth.
 */
export default function InventoryClient({
  initialItems,
  initialError,
}: {
  initialItems: InventoryItem[];
  initialError: string | null;
}) {
  // Same reason as the other server-rendered screens: this is what made a car
  // recorded as a Deal fail to appear in Inventory until the cache expired.
  useFreshServerData();

  const [items, setItems] = useServerState<InventoryItem[]>(initialItems);
  // Both come straight from the server render. There is no client-side load to
  // be "during" any more, and no client-side read that could fail on its own —
  // `loading.tsx` covers the gap while the server works.
  const error = initialError;
  const identity = useStaffIdentity();
  const isOwner = !identity || identity.role === "admin" || identity.role === "manager";
  const isPurchaser = identity?.role === "purchaser";
  // Empty means "all" — same rule as the Leads filters. Unticking the last box
  // returns every car rather than emptying the table with no obvious way back.
  const [statusFilter, setStatusFilter] = useState<InventoryStatus[]>([]);
  const [originFilter, setOriginFilter] = useState<Array<"valuation" | "scrap">>([]);
  const [vinSearch, setVinSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<InventoryRole[]>(() => ROLE_FILTER_OPTIONS.map((role) => role.value));
  /**
   * Purchase month, as `YYYY-MM`. Defaults to the month happening now.
   *
   * Unlike every other filter on the dashboard, this one does NOT start empty.
   * Opening Inventory to answer "what have I bought recently" should not first
   * require narrowing away a year of history — the current month is the answer
   * being looked for, and older months are a deliberate step back.
   *
   * Empty still means every month, so clearing the box gives the full list.
   */
  const currentMonth = useMemo(() => uaeMonthKey(new Date()), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const attention = searchParams.get("attention");
  const isAgingFilter = attention === "aging";

  const [monthFilter, setMonthFilter] = useState<string[]>(() =>
    isAgingFilter ? [] : [uaeMonthKey(new Date())]
  );

  const [selling, setSelling] = useState<InventoryItem | null>(null);
  const [sellBusy, setSellBusy] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  // There is no client-side loader here any more.
  //
  // The list arrives from the server render, is re-read on arrival and on focus
  // (useFreshServerData), and is re-read again after a sale via router.refresh().
  // The old load() duplicated all of that over a second HTTP endpoint, which is
  // how a sale could end up racing itself. /api/admin/inventory still exists and
  // is still used by the lead detail screen; it is simply not a second source of
  // truth for this page.

  /**
   * The months that actually contain a purchase, newest first.
   *
   * Derived from the rows rather than generated from a calendar, so the list
   * can only ever offer a month with cars in it — picking one and finding an
   * empty table would make the filter look broken.
   *
   * Grouped by UAE month to match every other date on this dashboard.
   */
  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      const key = uaeMonthKey(new Date(item.purchasedAt));
      if (!seen.has(key)) seen.set(key, formatUaeMonth(key));
    }
    // This month is always offered, even before it has a single car in it —
    // it is the default, so it has to be selectable and has to have a label.
    if (!seen.has(currentMonth)) seen.set(currentMonth, formatUaeMonth(currentMonth));

    return Array.from(seen.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [items, currentMonth]);

  const visible = useMemo(() => {
    let result = items;
    if (isAgingFilter) {
      const now = Date.now();
      result = result.filter(
        (i) => i.status === "in_stock" && now - new Date(i.purchasedAt).getTime() > 90 * 86_400_000,
      );
    }
    if (statusFilter.length > 0) result = result.filter((i) => statusFilter.includes(i.status));
    if (originFilter.length > 0) result = result.filter((i) => originFilter.includes(i.inquiryType ?? "valuation"));
    if (monthFilter.length > 0 && !isAgingFilter) {
      result = result.filter((i) => monthFilter.includes(uaeMonthKey(new Date(i.purchasedAt))));
    }
    const vin = vinSearch.trim().toLowerCase();
    if (vin) result = result.filter((item) => item.chassisNumber.toLowerCase().includes(vin));
    return result;
  }, [items, statusFilter, originFilter, monthFilter, isAgingFilter, vinSearch]);

  /**
   * Headline figures — for whatever the filters are showing, not for everything.
   *
   * They summed every car regardless of the table beneath them, so picking a
   * month would have left the cards describing a different set of rows than the
   * ones on screen. That is the most misleading thing a dashboard can do:
   * "Capital tied up" under an August filter has to mean August.
   *
   * Capital tied up is the figure the owner feels day to day — his own money
   * sitting on the lot, not a performance metric.
   */
  const summary = useMemo(() => {
    // "Owned" means in stock. `reserved` and `withdrawn` are no longer part of
    // the interface, but a legacy row holding one would still be a car the
    // business paid for — so `withdrawn` is excluded (deliberately no longer
    // for sale) while `reserved` still counts as held.
    const held = visible.filter((i) => i.status === "in_stock" || i.status === "reserved");

    // Every role total comes from its frozen database ledger entry. This keeps
    // Inventory aligned with the Commission tab and avoids inventing a 2% or
    // 10% payee for a sale that had no assigned staff member.
    const agentCommission = visible.reduce(
      (sum, i) => sum + (i.callCenterCommissionAed ?? 0),
      0,
    );
    const purchaserCommission = visible.reduce(
      (sum, i) => sum + (i.purchaserCommissionAed ?? 0),
      0,
    );
    const developerCommission = visible.reduce((sum, i) => sum + (i.commission?.commissionAed ?? 0), 0);

    return {
      inStock: held.length,
      capital: held.reduce((sum, i) => sum + i.purchasePriceAed, 0),
      profit: visible.reduce((sum, i) => sum + (i.commission?.profitAed ?? 0), 0),
      totalCommission: isPurchaser ? purchaserCommission : agentCommission + purchaserCommission + developerCommission,
      roleProfit: {
        callCenter: agentCommission,
        purchaser: purchaserCommission,
        developer: developerCommission,
      },
    };
  }, [visible, isPurchaser]);

  async function confirmSale(salePriceAed: number, soldAt: string) {
    if (!selling) return;
    setSellBusy(true);
    setSellError(null);

    // Preview mode updates the list so the flow can be demonstrated end to end,
    // but nothing is written and the figures are discarded on reload.
    if (ADMIN_PREVIEW) {
      setItems((current) =>
        current.map((i) =>
          i.id === selling.id
            ? {
                ...i,
                status: "sold" as const,
                salePriceAed,
                soldAt,
                netProfitAed: null,
                financialStatus: "awaiting_confirmation",
                financialReviewVersion: i.financialReviewVersion + 1,
                commission: null,
              }
            : i,
        ),
      );
      setSellBusy(false);
      setSelling(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/inventory/${selling.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sell", sale_price_aed: salePriceAed, sold_at: soldAt }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setSellError(body?.error?.message ?? "Couldn't save the sale. Please try again.");
        return;
      }
      setSelling(null);

      // ONE way to re-read after a write: ask the server to render again.
      //
      // This used to call load() — a second HTTP fetch of the same rows — and
      // then router.refresh() as well. Two independent reads racing to set the
      // same state, where whichever answered last won. When the refresh payload
      // was computed a moment before the sale committed, it overwrote the fresh
      // list with the pre-sale one, and the car sat there still saying
      // "In Stock" with a Mark sold button, on a sale the database had accepted.
      //
      // Dropping load() also removes an entire round trip per sale, and keeps
      // Commission and the Overview correct in the same step, since refreshing
      // re-renders every server component on the route.
      router.refresh();
    } catch {
      setSellError("Couldn't reach the server. The sale has not been saved.");
    } finally {
      setSellBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Inventory</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          Cars you have bought and now own. A car appears here automatically once its lead is marked as a Deal.
        </p>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      {isAgingFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/20 text-red-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Inventory Watch Filter Active
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                  {visible.length} {visible.length === 1 ? "car" : "cars"} waiting &gt; 90 days
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                Cars Waiting Too Long (90+ Days in Stock)
              </p>
              <p className="text-xs text-gray-300">
                Showing all unsold inventory in stock for over 90 days across all purchase months.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.replace("/admin/inventory")}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
            Clear attention filter & show all stock
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Cars owned" value={String(summary.inStock)} />
        <Summary label="Capital tied up" value={formatNumber(summary.capital)} />
        <Summary label="Profit from sales" value={formatNumber(summary.profit)} />
        <Summary
          label={isPurchaser ? "Outstanding purchaser commission (10%)" : "Total commission (14%)"}
          value={formatNumber(summary.totalCommission)}
          accent
        />
      </div>

      {isOwner && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Summary label="Call Centre commission (2%)" value={formatNumber(summary.roleProfit.callCenter)} />
          <Summary label="Purchaser commission (10%)" value={formatNumber(summary.roleProfit.purchaser)} />
          <Summary label="Developer commission (2%)" value={formatNumber(summary.roleProfit.developer)} />
        </div>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <MultiSelect
              className="w-full sm:w-52"
              options={STATUS_FILTER_OPTIONS}
              selected={statusFilter}
              onChange={(v) => setStatusFilter(v as InventoryStatus[])}
              allLabel="All statuses"
              noun="statuses"
            />
            <MultiSelect
              className="w-full sm:w-52"
              options={[...ORIGIN_FILTER_OPTIONS]}
              selected={originFilter}
              onChange={(values) => setOriginFilter(values as Array<"valuation" | "scrap">)}
              allLabel="All origins"
              noun="origins"
            />
            {isOwner && (
              <MultiSelect
                className="w-full sm:w-60"
                options={ROLE_FILTER_OPTIONS}
                selected={roleFilter}
                onChange={(v) => setRoleFilter(v as InventoryRole[])}
                allLabel="All roles"
                noun="roles"
              />
            )}
            {/* Shown as soon as there is anything to filter.
                It was hidden below two months on the reasoning that a
                single-option filter cannot change anything — true, but wrong
                here: every inventory starts life inside one month, so the
                control would be invisible exactly when someone first goes
                looking for it, and its absence reads as a missing feature
                rather than an empty one. */}
            {monthOptions.length > 0 && (
              <MultiSelect
                className="w-full sm:w-52"
                options={monthOptions}
                selected={monthFilter}
                onChange={setMonthFilter}
                allLabel="All months"
                noun="months"
              />
            )}
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Search Chassis or VIN Number</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
              <input value={vinSearch} onChange={(event) => setVinSearch(event.target.value)} placeholder="Search Chassis / VIN Number" className="min-h-11 w-full rounded-btn border border-border bg-surface-2 pl-10 pr-3 text-sm text-text outline-none placeholder:text-text-faint focus:border-gold" />
            </label>
          </div>
          {/* The Refresh button is gone deliberately.
              The page now re-reads on arrival and whenever the tab regains
              focus (useFreshServerData), and a sale re-reads immediately, so
              the button could only ever repeat work that had just happened.
              A control that exists to fetch data the screen already fetched
              teaches people not to trust what is on screen without pressing
              it — which is the opposite of what it looks like it is for. */}
        </div>

        <div className="mt-3 flex justify-end">
          <ExportMenu
            onPdf={() => exportInventoryPdf(visible)}
            onExcel={() => exportExcel("CarVibeDubai Inventory", inventoryExportRows(visible), "carvibedubai-inventory.xls")}
          />
        </div>

        {visible.length === 0 ? (
          <div className="py-10 text-center">
            {/* Says which filter emptied the table. Because this page opens
                filtered to the current month, "No cars yet" would otherwise be
                a lie the moment a quiet month began — the cars are there, just
                not in the month being shown, and the way out is one click. */}
            <p className="text-fluid-0 text-text">
              {items.length === 0
                ? "No cars yet."
                : monthFilter.length > 0
                  ? `Nothing bought in ${monthFilter.map(formatUaeMonth).join(", ")}.`
                  : "No cars with this status."}
            </p>
            <p className="mt-1 text-fluid--1 text-text-muted">
              {items.length === 0 ? (
                <>
                  Mark a lead as a <span className="text-text">Deal</span> and record what you paid — the car will
                  show up here.
                </>
              ) : monthFilter.length > 0 ? (
                <>
                  You own {items.length} car{items.length === 1 ? "" : "s"} in total — clear the month filter to see
                  {items.length === 1 ? " it" : " them all"}.
                </>
              ) : (
                "Try a different filter."
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile / Medium Screen Streamlined List (Car priority, no wide table overflow) */}
            <div className="mt-5 block lg:hidden">
              <MobileInventoryList
                items={visible}
                onSell={(item) => {
                  setSellError(null);
                  setSelling(item);
                }}
              />
            </div>

            {/* Desktop / Large Screen Full 11-Column Table */}
            <div className="hidden lg:block">
              <InventoryTable
                items={visible}
                roleFilter={roleFilter}
                viewerRole={isPurchaser ? "purchaser" : "owner"}
                onSell={(item) => {
                  setSellError(null);
                  setSelling(item);
                }}
              />
            </div>
          </>
        )}
      </Card>

      <SellCarDialog
        car={selling}
        busy={sellBusy}
        error={sellError}
        onConfirm={(price, soldAt) => void confirmSale(price, soldAt)}
        onCancel={() => setSelling(null)}
      />
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "border-gold/40" : ""}`}>
      <p className="text-fluid--1 text-text-faint">{label}</p>
      <p className={`mt-1.5 tabular-nums text-fluid-1 ${accent ? "text-gold" : "text-text"}`}>{value}</p>
    </Card>
  );
}
