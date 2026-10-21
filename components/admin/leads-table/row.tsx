"use client";

import { memo } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/Pill";
import { Lead } from "@/config/mock-data";
import { formatDate, formatMileage, formatNumber } from "@/lib/format";

type Props = { lead: Lead; duplicateReview?: boolean; showArrivalStatus?: boolean };

const SOURCE_LABELS: Record<string, string> = {
  web: "Website form",
  recovered: "Recovered form",
  manual_walk_in: "Walk-in",
  manual_phone_call: "Phone call",
  manual_whatsapp: "WhatsApp / msg",
  manual_other: "Other",
};

export const LeadRow = memo(function LeadRow({ lead, duplicateReview = false, showArrivalStatus = false }: Props) {
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors">
      <td className="py-3.5 pl-4 pr-3 min-w-[160px]">
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/admin/leads/${lead.id}${lead.inquiryType === "scrap" ? "?origin=scrap" : ""}`}
            className="font-semibold text-text hover:text-gold transition-colors"
          >
            {lead.fullName || "Customer"}
          </Link>
          {duplicateReview && (
            <span className={lead.isDuplicate ? "text-[11px] font-medium text-warning" : "text-[11px] text-text-faint"}>
              {lead.isDuplicate ? "Flagged repeat submission" : "Earlier matching submission"}
            </span>
          )}
        </div>
      </td>
      <td className="py-3.5 pr-3 min-w-[180px] text-text-muted">
        {lead.year} {lead.make} {lead.model}
      </td>
      <td className="py-3.5 pr-3 min-w-[110px] text-text-muted whitespace-nowrap text-xs">
        {lead.inquiryType === "scrap" ? "Scrap inquiry" : SOURCE_LABELS[lead.source ?? "web"] ?? "Other"}
      </td>
      <td className="py-3.5 pr-3 min-w-[105px] text-text-muted whitespace-nowrap tabular-nums text-xs">
        {formatMileage(lead.mileageValue ?? lead.mileageKm, lead.mileageUnit)}
      </td>
      <td className="py-3.5 pr-3 min-w-[100px] text-text-muted whitespace-nowrap text-xs">
        {lead.location || "—"}
      </td>
      <td className="py-3.5 pr-3 min-w-[125px] text-text-muted whitespace-nowrap tabular-nums text-xs">
        {formatDate(lead.createdAt)}
      </td>
      <td className="py-3.5 pr-3 min-w-[110px] text-text-muted whitespace-nowrap tabular-nums text-xs">
        {lead.estimatedValueAed == null ? "—" : formatNumber(lead.estimatedValueAed)}
      </td>
      <td className="py-3.5 pr-3 min-w-[115px] whitespace-nowrap">
        <StatusPill status={lead.status} />
      </td>
      {showArrivalStatus && (
        <td className="py-3.5 pr-4 min-w-[130px] whitespace-nowrap">
          {lead.arrivalStatus === "arrived" ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 shadow-sm">
              Arrived
            </span>
          ) : (
            <span className="text-xs text-text-faint">
              {lead.status === "inspection_scheduled" ? "Awaiting" : "Not yet arrived"}
            </span>
          )}
        </td>
      )}
    </tr>
  );
});
