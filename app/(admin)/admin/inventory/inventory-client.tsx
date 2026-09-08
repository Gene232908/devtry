"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { SellCarDialog } from "@/components/admin/SellCarDialog";
import { formatAed, formatDate } from "@/lib/format";
import { formatUaeMonth, uaeMonthKey } from "@/lib/uae-time";
import {
  AGENT_COMMISSION_RATE,
  COMMISSION_RATE,
  INVENTORY_FILTER_OPTIONS,
  INVENTORY_STATUS_LABEL,
  PURCHASER_COMMISSION_RATE,
  round2,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/admin/inventory";
import { useFreshServerData, useServerState } from "@/lib/admin/use-fresh-server-data";
import { ADMIN_PREVIEW, PREVIEW_NOTICE } from "@/lib/admin/preview-mode";

// Cars the business has bought and now owns. Stock arrives here automatically
// when a lead is marked as a Deal — there is no "add a car" button, because a
// car with no lead behind it would have no purchase price to be paid against.

const STATUS_STYLE: Record<InventoryStatus, string> = {
  in_stock: "border-gold/40 bg-gold/10 text-gold",
  reserved: "border-info/40 bg-info/10 text-info",
  sold: "border-success/40 bg-success/10 text-success",
  withdrawn: "border-border bg-surface-2 text-text-muted",
};

// "All" is no longer an option in the list: with checkboxes it is simply
// nothing ticked, and a box labelled "All" sitting alongside the others could
// contradict them.
const STATUS_FILTER_OPTIONS = INVENTORY_FILTER_OPTIONS.map((s) => ({
  value: s,
  label: INVENTORY_STATUS_LABEL[s],
}));

function StatusChip({ status }: { status: InventoryStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-fluid--1 ${STATUS_STYLE[status]}`}>
      {INVENTORY_STATUS_LABEL[status]}
    </span>
  );
}

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
  // Empty means "all" — same rule as the Leads filters. Unticking the last box
  // returns every car rather than emptying the table with no obvious way back.
  const [statusFilter, setStatusFilter] = useState<InventoryStatus[]>([]);
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
  const [monthFilter, setMonthFilter] = useState<string[]>(() => [uaeMonthKey(new Date())]);
  const router = useRouter();

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
    if (statusFilter.length > 0) result = result.filter((i) => statusFilter.includes(i.status));
    if (monthFilter.length > 0) {
      result = result.filter((i) => monthFilter.includes(uaeMonthKey(new Date(i.purchasedAt))));
    }
    return result;
  }, [items, statusFilter, monthFilter]);

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

    // Developer's share is frozen per sale in the database (`i.commission`),
    // so it is summed as-is. Agent and purchaser shares have no such record —
    // the Commission page's per-staff totals aren't backed by a table yet —
    // so they are computed the same way `previewCommission` does: the rate
    // against each sale's own profit, rounded per car rather than once at the
    // end, so this total agrees with what per-car figures would add up to.
    const agentCommission = visible.reduce(
      (sum, i) => sum + round2(Math.max(i.commission?.profitAed ?? 0, 0) * AGENT_COMMISSION_RATE),
      0,
    );
    const purchaserCommission = visible.reduce(
      (sum, i) => sum + round2(Math.max(i.commission?.profitAed ?? 0, 0) * PURCHASER_COMMISSION_RATE),
      0,
    );
    const developerCommission = visible.reduce((sum, i) => sum + (i.commission?.commissionAed ?? 0), 0);

    return {
      inStock: held.length,
      capital: held.reduce((sum, i) => sum + i.purchasePriceAed, 0),
      profit: visible.reduce((sum, i) => sum + (i.commission?.profitAed ?? 0), 0),
      totalCommission: agentCommission + purchaserCommission + developerCommission,
    };
  }, [visible]);

  async function confirmSale(salePriceAed: number, soldAt: string) {
    if (!selling) return;
    setSellBusy(true);
    setSellError(null);

    // Preview mode updates the list so the flow can be demonstrated end to end,
    // but nothing is written and the figures are discarded on reload.
    if (ADMIN_PREVIEW) {
      const profitAed = salePriceAed - selling.purchasePriceAed;
      setItems((current) =>
        current.map((i) =>
          i.id === selling.id
            ? {
                ...i,
                status: "sold" as const,
                salePriceAed,
                soldAt,
                commission: {
                  profitAed,
                  rate: COMMISSION_RATE,
                  commissionAed: Math.max(profitAed, 0) * COMMISSION_RATE,
                  soldAt,
                },
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Cars owned" value={String(summary.inStock)} />
        <Summary label="Capital tied up" value={formatAed(summary.capital)} />
        <Summary label="Profit from sales" value={formatAed(summary.profit)} />
        <Summary
          label={`Total commission (${((AGENT_COMMISSION_RATE + PURCHASER_COMMISSION_RATE + COMMISSION_RATE) * 100).toFixed(0)}%)`}
          value={formatAed(summary.totalCommission)}
          accent
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <MultiSelect
              className="w-full sm:w-52"
              options={STATUS_FILTER_OPTIONS}
              selected={statusFilter}
              onChange={(v) => setStatusFilter(v as InventoryStatus[])}
              allLabel="All statuses"
              noun="statuses"
            />
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
          </div>
          {/* The Refresh button is gone deliberately.
              The page now re-reads on arrival and whenever the tab regains
              focus (useFreshServerData), and a sale re-reads immediately, so
              the button could only ever repeat work that had just happened.
              A control that exists to fetch data the screen already fetched
              teaches people not to trust what is on screen without pressing
              it — which is the opposite of what it looks like it is for. */}
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
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-fluid--1">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="py-2 pr-4 font-normal">Car</th>
                  <th className="py-2 pr-4 font-normal">Bought</th>
                  <th className="py-2 pr-4 text-right font-normal">Paid</th>
                  <th className="py-2 pr-4 text-right font-normal">Sold for</th>
                  <th className="py-2 pr-4 text-right font-normal">Profit</th>
                  <th className="py-2 pr-4 text-right font-normal">Your 2%</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-1 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/leads/${item.leadId}`} className="text-text hover:text-gold">
                        {item.year} {item.make} {item.model}
                      </Link>
                      {item.trim && <span className="block text-text-faint">{item.trim}</span>}
                      {/* This car came from a form nobody ever finished, so the
                          seller's number was never proved to be theirs — worth
                          knowing before ringing it about the paperwork. */}
                      {item.fromUnverifiedLead && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-fluid--1 text-warning">
                          <ShieldAlert className="h-3.5 w-3.5" /> Unverified number
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{formatDate(item.purchasedAt)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted">
                      {formatAed(item.purchasePriceAed)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted">
                      {formatAed(item.salePriceAed)}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right tabular-nums ${
                        (item.commission?.profitAed ?? 0) < 0 ? "text-danger" : "text-text"
                      }`}
                    >
                      {item.commission ? formatAed(item.commission.profitAed) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-gold">
                      {item.commission ? formatAed(item.commission.commissionAed) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusChip status={item.status} />
                    </td>
                    <td className="py-3 pl-2 pr-1 text-right">
                      {/* Nothing to sell once it is sold. `withdrawn` is kept in
                          the check for legacy rows: it means deliberately not
                          for sale, so offering the button would be wrong. */}
                      {item.status === "sold" || item.status === "withdrawn" ? (
                        <span className="text-text-faint">—</span>
                      ) : (
                        <Button
                          variant="outline"
                          className="px-3"
                          onClick={() => {
                            setSellError(null);
                            setSelling(item);
                          }}
                          title={ADMIN_PREVIEW ? PREVIEW_NOTICE : "Record the price this car sold for"}
                        >
                          <BadgeDollarSign className="h-4 w-4" /> Mark sold
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
