"use client";

import Link from "next/link";
import { BadgeDollarSign, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatAed, formatDate } from "@/lib/format";
import {
  AGENT_COMMISSION_RATE,
  PURCHASER_COMMISSION_RATE,
  round2,
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
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-fluid--1 ${STATUS_STYLE[status]}`}>
      {INVENTORY_STATUS_LABEL[status]}
    </span>
  );
}

type Props = {
  items: InventoryItem[];
  roleFilter: InventoryRole[];
  isOwner: boolean;
  onSell: (item: InventoryItem) => void;
};

export function InventoryTable({ items, roleFilter, isOwner, onSell }: Props) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-fluid--1">
        <thead>
          <tr className="border-b border-border text-text-faint">
            <th className="py-2 pr-4 font-normal">Car</th>
            <th className="py-2 pr-4 font-normal">Chassis / VIN Number</th>
            <th className="py-2 pr-4 font-normal">Bought</th>
            <th className="py-2 pr-4 text-right font-normal">Paid</th>
            <th className="py-2 pr-4 text-right font-normal">Sold for</th>
            <th className="py-2 pr-4 text-right font-normal">Profit</th>
            {(!isOwner || roleFilter.includes("call_center")) && (
              <th className="py-2 pr-4 text-right font-normal">Call Centre 2%</th>
            )}
            {(!isOwner || roleFilter.includes("purchaser")) && (
              <th className="py-2 pr-4 text-right font-normal">Purchaser 10%</th>
            )}
            {(!isOwner || roleFilter.includes("developer")) && (
              <th className="py-2 pr-4 text-right font-normal">Developer 2%</th>
            )}
            <th className="py-2 pr-4 font-normal">Status</th>
            <th className="py-2 pr-1 text-right font-normal">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="py-3 pr-4">
                <Link href={`/admin/leads/${item.leadId}`} className="text-text hover:text-gold">
                  {item.year} {item.make} {item.model}
                </Link>
                {item.trim && <span className="block text-text-faint">{item.trim}</span>}
                {item.fromUnverifiedLead && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-fluid--1 text-warning">
                    <ShieldAlert className="h-3.5 w-3.5" /> Unverified number
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-text-muted">
                {item.chassisNumber || "—"}
              </td>
              <td className="py-3 pr-4 text-text-muted whitespace-nowrap">{formatDate(item.purchasedAt)}</td>
              <td className="py-3 pr-4 text-right tabular-nums text-text-muted whitespace-nowrap">
                {formatAed(item.purchasePriceAed)}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums text-text-muted whitespace-nowrap">
                {formatAed(item.salePriceAed)}
              </td>
              <td
                className={`py-3 pr-4 text-right tabular-nums whitespace-nowrap ${
                  (item.commission?.profitAed ?? 0) < 0 ? "text-danger" : "text-text"
                }`}
              >
                {item.commission ? formatAed(item.commission.profitAed) : "—"}
              </td>
              {(!isOwner || roleFilter.includes("call_center")) && (
                <td className="py-3 pr-4 text-right tabular-nums text-gold whitespace-nowrap">
                  {item.commission ? formatAed(round2(Math.max(item.commission.profitAed, 0) * AGENT_COMMISSION_RATE)) : "—"}
                </td>
              )}
              {(!isOwner || roleFilter.includes("purchaser")) && (
                <td className="py-3 pr-4 text-right tabular-nums text-gold whitespace-nowrap">
                  {item.commission ? formatAed(round2(Math.max(item.commission.profitAed, 0) * PURCHASER_COMMISSION_RATE)) : "—"}
                </td>
              )}
              {(!isOwner || roleFilter.includes("developer")) && (
                <td className="py-3 pr-4 text-right tabular-nums text-gold whitespace-nowrap">
                  {item.commission ? formatAed(item.commission.commissionAed) : "—"}
                </td>
              )}
              <td className="py-3 pr-4 whitespace-nowrap">
                <StatusChip status={item.status} />
              </td>
              <td className="py-3 pl-2 pr-1 text-right whitespace-nowrap">
                {item.status === "sold" || item.status === "withdrawn" ? (
                  <span className="text-text-faint">—</span>
                ) : (
                  <Button
                    variant="outline"
                    className="px-3"
                    onClick={() => onSell(item)}
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
  );
}
