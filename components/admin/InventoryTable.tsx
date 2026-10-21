"use client";

import Link from "next/link";
import { BadgeDollarSign } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatAed, formatDate, formatNumber } from "@/lib/format";
import { ScrapInquiryBadge } from "@/components/admin/ScrapInquiryBadge";
import {
  INVENTORY_STATUS_LABEL,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/admin/inventory";
import { ADMIN_PREVIEW, PREVIEW_NOTICE } from "@/lib/admin/preview-mode";

export type InventoryRole = "call_center" | "purchaser" | "developer";

const STATUS_STYLE: Record<InventoryStatus, string> = {
  in_stock: "border-gold/40 bg-gold/10 text-gold",
  reserved: "border-info/40 bg-info/10 text-info",
  sold: "border-success/40 bg-success/10 text-success",
  withdrawn: "border-border bg-surface-2 text-text-muted",
};

export function StatusChip({ status }: { status: InventoryStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {INVENTORY_STATUS_LABEL[status]}
    </span>
  );
}

type Props = {
  items: InventoryItem[];
  roleFilter: InventoryRole[];
  viewerRole: "owner" | "purchaser";
  onSell: (item: InventoryItem) => void;
};

export function InventoryTable({ items, roleFilter, viewerRole, onSell }: Props) {
  const isOwner = viewerRole === "owner";
  const showCallCenter = isOwner && roleFilter.includes("call_center");
  const showPurchaser = viewerRole === "purchaser" || (isOwner && roleFilter.includes("purchaser"));
  const showDeveloper = isOwner && roleFilter.includes("developer");
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[1120px] text-left text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-border/70 text-text-muted font-mono uppercase text-[11px] tracking-wider bg-surface-2/30">
            <th className="py-3 px-4 font-medium">Car</th>
            <th className="py-3 px-4 font-medium">Chassis / VIN Number</th>
            <th className="py-3 px-4 font-medium">Sold date</th>
            <th className="py-3 px-4 text-right font-medium">Paid</th>
            <th className="py-3 px-4 text-right font-medium">Paid amount</th>
            <th className="py-3 px-4 text-right font-medium">Expenses</th>
            <th className="py-3 px-4 text-right font-medium">Net profit</th>
            {showCallCenter && (
              <th className="py-3 px-4 text-right font-medium">Call Centre AED</th>
            )}
            {showPurchaser && (
              <th className="py-3 px-4 text-right font-medium">Purchaser AED</th>
            )}
            {showDeveloper && (
              <th className="py-3 px-4 text-right font-medium">Developer AED</th>
            )}
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 pr-2 pl-4 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
              <td className="py-3.5 px-4">
                <Link
                  href={`/admin/leads/${item.leadId}`}
                  className="font-semibold text-text hover:text-gold transition text-xs sm:text-sm"
                >
                  {item.year} {item.make} {item.model}
                </Link>
                {item.trim && <span className="block text-xs text-text-muted mt-0.5">{item.trim}</span>}
                {item.inquiryType === "scrap" && (
                  <ScrapInquiryBadge compact className="mt-1" />
                )}
              </td>
              <td className="py-3.5 px-4 font-mono text-xs text-text-muted">
                {item.chassisNumber || "—"}
              </td>
              <td className="py-3.5 px-4 text-text-muted whitespace-nowrap text-xs">{formatDate(item.purchasedAt)}</td>
              <td className="py-3.5 px-4 text-right tabular-nums text-text font-medium whitespace-nowrap text-xs sm:text-sm">
                {formatAed(item.purchasePriceAed)}
              </td>
              <td className="py-3.5 px-4 text-right tabular-nums text-text font-medium whitespace-nowrap text-xs sm:text-sm">
                {formatAed(item.salePriceAed)}
              </td>
              <td className="py-3.5 px-4 text-right tabular-nums text-text font-medium whitespace-nowrap text-xs sm:text-sm">
                {formatAed(item.expenseTotalAed)}
              </td>
              <td
                className={`py-3.5 px-4 text-right tabular-nums font-semibold whitespace-nowrap text-xs sm:text-sm ${
                  (item.netProfitAed ?? item.commission?.profitAed ?? 0) < 0 ? "text-danger" : "text-emerald-400"
                }`}
              >
                {item.financialStatus === "awaiting_confirmation"
                  ? "Review expenses"
                  : item.netProfitAed !== null
                    ? formatAed(item.netProfitAed)
                    : item.commission ? formatAed(item.commission.profitAed) : "—"}
              </td>
              {showCallCenter && (
                <td className="py-3.5 px-4 text-right tabular-nums text-gold font-semibold whitespace-nowrap text-xs sm:text-sm">
                  {item.callCenterCommissionAed === null ? "—" : formatNumber(item.callCenterCommissionAed)}
                </td>
              )}
              {showPurchaser && (
                <td className="py-3.5 px-4 text-right tabular-nums text-gold font-semibold whitespace-nowrap text-xs sm:text-sm">
                  {item.purchaserCommissionAed === null ? "—" : formatNumber(item.purchaserCommissionAed)}
                </td>
              )}
              {showDeveloper && (
                <td className="py-3.5 px-4 text-right tabular-nums text-gold font-semibold whitespace-nowrap text-xs sm:text-sm">
                  {item.commission ? formatNumber(item.commission.commissionAed) : "—"}
                </td>
              )}
              <td className="py-3.5 px-4 whitespace-nowrap">
                <StatusChip status={item.status} />
              </td>
              <td className="py-3.5 pr-2 pl-4 text-right whitespace-nowrap">
                {item.status === "sold" || item.status === "withdrawn" ? (
                  <span className="text-text-faint">—</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-xs"
                    onClick={() => onSell(item)}
                    title={ADMIN_PREVIEW ? PREVIEW_NOTICE : "Record the price this car sold for"}
                  >
                    <BadgeDollarSign className="h-4 w-4 mr-1" /> Mark sold
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
