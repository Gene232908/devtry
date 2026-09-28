"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { formatAed } from "@/lib/format";
import { previewCommission, type InventoryItem } from "@/lib/admin/inventory";

/** `yyyy-mm-dd` in local time, for a native date input. */
function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Records a completed sale.
 *
 * The profit is shown live as the price is typed before anything is saved.
 * Once confirmed these figures are frozen and cannot
 * be edited, so the owner should never meet them for the first time afterwards.
 */
export function SellCarDialog({
  car,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  car: InventoryItem | null;
  busy: boolean;
  error: string | null;
  onConfirm: (salePriceAed: number, soldAt: string) => void;
  onCancel: () => void;
}) {
  const [price, setPrice] = useState("");
  const [soldAt, setSoldAt] = useState(todayInputValue());

  // Reset per car, so a price typed for one does not carry to the next.
  useEffect(() => {
    if (car) {
      setPrice("");
      setSoldAt(todayInputValue());
    }
  }, [car]);

  const parsed = Number(price);
  const valid = price.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
  const preview = car && valid ? previewCommission(car.purchasePriceAed, parsed, car.expenseTotalAed) : null;
  const atALoss = preview !== null && preview.profitAed < 0;

  return (
    <ConfirmDialog
      open={car !== null}
      title="Record this sale"
      description={
        car ? (
          <>
            <span className="text-text">
              {car.year} {car.make} {car.model}
            </span>
            , bought for {formatAed(car.purchasePriceAed)}. After saving the sale, review and confirm expenses before
            any commission becomes payable.
          </>
        ) : null
      }
      confirmLabel="Save sale"
      cancelLabel="Cancel"
      busy={busy}
      confirmDisabled={!valid || soldAt.trim() === ""}
      onConfirm={() => onConfirm(parsed, new Date(soldAt).toISOString())}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Sale price (AED) *"
          inputMode="numeric"
          autoFocus
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 185000"
        />
        <Input label="Sale date" type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />

        {preview && (
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-2 px-4 py-3 text-fluid--1">
            <Row label="Sale price" value={formatAed(parsed)} />
            <Row label="Purchase price" value={`− ${formatAed(car!.purchasePriceAed)}`} />
            <Row label="Expenses" value={`− ${formatAed(car!.expenseTotalAed)}`} />
            <div className="border-t border-border pt-2">
              <Row
                label="Net profit before commissions"
                value={formatAed(preview.profitAed)}
                tone={atALoss ? "text-danger" : "text-text"}
              />
            </div>
            {atALoss && (
              <p className="text-text-faint">
                Sold below what it cost. The loss is not taken off any other sale.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-fluid--1 text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

function Row({ label, value, tone = "text-text" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className={`tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
