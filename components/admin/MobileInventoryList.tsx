"use client";

import Link from "next/link";
import { BadgeDollarSign, ChevronRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatAed, formatDate } from "@/lib/format";
import { ScrapInquiryBadge } from "@/components/admin/ScrapInquiryBadge";
import {
  INVENTORY_STATUS_LABEL,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/admin/inventory";
import { ADMIN_PREVIEW, PREVIEW_NOTICE } from "@/lib/admin/preview-mode";

const STATUS_STYLE: Record<InventoryStatus, string> = {
  in_stock: "border-gold/40 bg-gold/10 text-gold",
  reserved: "border-info/40 bg-info/10 text-info",
  sold: "border-success/40 bg-success/10 text-success",
  withdrawn: "border-border bg-surface-2 text-text-muted",
};

type Props = {
  items: InventoryItem[];
  onSell: (item: InventoryItem) => void;
  emptyMessage?: string;
};

export function MobileInventoryList({
  items,
  onSell,
  emptyMessage = "No cars match your filters.",
}: Props) {
  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-fluid--1 text-text-faint rounded-xl border border-white/[0.08] bg-surface-1/40">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 text-xs text-text-faint">
        <span className="font-semibold uppercase tracking-wider text-text-muted">
          Car Inventory
        </span>
        <span>Tap car to open details</span>
      </div>

      <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-surface-1/40 overflow-hidden shadow-lg">
        {items.map((item) => {
          const carTitle = `${item.year} ${item.make} ${item.model}`;
          const isSold = item.status === "sold";
          const isWithdrawn = item.status === "withdrawn";

          return (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 transition-all hover:bg-white/[0.02]"
            >
              {/* Primary Car Header & Status Row */}
              <div className="flex items-start justify-between gap-2.5">
                <Link
                  href={`/admin/leads/${item.leadId}`}
                  className="group flex flex-col min-w-0 flex-1 pr-2"
                >
                  <span className="font-bold text-text text-sm sm:text-base group-hover:text-gold transition-colors truncate">
                    {carTitle}
                  </span>
                  {item.trim && (
                    <span className="text-xs text-text-muted truncate mt-0.5">
                      {item.trim}
                    </span>
                  )}
                {item.inquiryType === "scrap" && (
                    <ScrapInquiryBadge compact className="mt-1" />
                )}
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status]}`}
                  >
                    {INVENTORY_STATUS_LABEL[item.status]}
                  </span>
                  <Link
                    href={`/admin/leads/${item.leadId}`}
                    className="text-text-faint hover:text-gold p-1 -mr-1"
                    aria-label={`View details for ${carTitle}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Chassis / VIN & Metadata */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint">
                {item.chassisNumber && (
                  <span className="font-mono text-zinc-300">
                    VIN: {item.chassisNumber}
                  </span>
                )}
                <span>Bought: {formatDate(item.purchasedAt)}</span>
                {item.fromUnverifiedLead && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                    <ShieldAlert className="h-3 w-3" /> Unverified number
                  </span>
                )}
              </div>

              {/* Pricing and Action Row */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] pt-2.5 text-xs">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 tabular-nums">
                  <span className="text-text-muted">
                    Paid: <strong className="font-semibold text-text">{formatAed(item.purchasePriceAed)}</strong>
                  </span>
                  {isSold && item.salePriceAed != null && (
                    <span className="text-text-muted">
                      Sold: <strong className="font-semibold text-emerald-400">{formatAed(item.salePriceAed)}</strong>
                    </span>
                  )}
                  {isSold && <span className="text-text-muted">Expenses: <strong className="font-semibold text-text">{formatAed(item.expenseTotalAed)}</strong></span>}
                  {isSold && item.financialStatus === "awaiting_confirmation" && <span className="text-warning">Net: <strong>Review expenses</strong></span>}
                  {isSold && item.financialStatus !== "awaiting_confirmation" && item.netProfitAed !== null && (
                    <span className={item.netProfitAed < 0 ? "text-danger" : "text-gold"}>
                      Net: <strong>{formatAed(item.netProfitAed)}</strong>
                    </span>
                  )}
                </div>

                {!isSold && !isWithdrawn && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs gap-1.5 border-border-gold/40 hover:border-gold/60 shrink-0"
                    onClick={() => onSell(item)}
                    title={ADMIN_PREVIEW ? PREVIEW_NOTICE : "Record the price this car sold for"}
                  >
                    <BadgeDollarSign className="h-3.5 w-3.5 text-gold" />
                    <span>Mark sold</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
