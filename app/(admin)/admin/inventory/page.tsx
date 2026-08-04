"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeDollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SellCarDialog } from "@/components/admin/SellCarDialog";
import { formatAed, formatDate } from "@/lib/format";
import {
  COMMISSION_RATE,
  INVENTORY_FILTER_OPTIONS,
  INVENTORY_STATUS_LABEL,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/admin/inventory";
import { ADMIN_PREVIEW, PREVIEW_NOTICE } from "@/lib/admin/preview-mode";
import { demoInventory } from "@/config/demo-admin-data";

// Cars the business has bought and now owns. Stock arrives here automatically
// when a lead is marked as a Deal — there is no "add a car" button, because a
// car with no lead behind it would have no purchase price to be paid against.

const STATUS_STYLE: Record<InventoryStatus, string> = {
  in_stock: "border-gold/40 bg-gold/10 text-gold",
  reserved: "border-info/40 bg-info/10 text-info",
  sold: "border-success/40 bg-success/10 text-success",
  withdrawn: "border-border bg-surface-2 text-text-muted",
};

function StatusChip({ status }: { status: InventoryStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-fluid--1 ${STATUS_STYLE[status]}`}>
      {INVENTORY_STATUS_LABEL[status]}
    </span>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InventoryStatus | "all">("all");

  const [selling, setSelling] = useState<InventoryItem | null>(null);
  const [sellBusy, setSellBusy] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    // Milestone 2: design preview — fixed demo cars only, so no real purchase
    // or sale figures are shown and nothing can be written from a walkthrough.
    if (ADMIN_PREVIEW) {
      setItems(demoInventory);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/inventory", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error?.message ?? "Couldn't load your inventory.");
        return;
      }
      setItems(body.data.items ?? []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  // Headline figures. Capital tied up is the one the owner feels day to day:
  // it is his own money sitting on the lot, not a performance metric.
  const summary = useMemo(() => {
    const held = items.filter((i) => i.status === "in_stock" || i.status === "reserved");
    return {
      inStock: held.length,
      capital: held.reduce((sum, i) => sum + i.purchasePriceAed, 0),
      profit: items.reduce((sum, i) => sum + (i.commission?.profitAed ?? 0), 0),
      commission: items.reduce((sum, i) => sum + (i.commission?.commissionAed ?? 0), 0),
    };
  }, [items]);

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
      await load();
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
          label={`Developer share (${(COMMISSION_RATE * 100).toFixed(0)}%)`}
          value={formatAed(summary.commission)}
          accent
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterChip>
            {INVENTORY_FILTER_OPTIONS.map((s) => (
              <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
                {INVENTORY_STATUS_LABEL[s]}
              </FilterChip>
            ))}
          </div>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <p className="mt-5 text-fluid--1 text-text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-fluid-0 text-text">
              {items.length === 0 ? "No cars yet." : "No cars with this status."}
            </p>
            <p className="mt-1 text-fluid--1 text-text-muted">
              {items.length === 0 ? (
                <>
                  Mark a lead as a <span className="text-text">Deal</span> and record what you paid — the car will
                  show up here.
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-fluid--1 transition-colors ${
        active ? "border-gold/50 bg-gold/15 text-gold" : "border-border text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
