"use client";

import { memo } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/Pill";
import { Lead } from "@/config/mock-data";
import { formatAed, formatDate } from "@/lib/format";

// Status is intentionally READ-ONLY here. It can only be changed inside
// Customer Details, where a change is reviewed and saved deliberately — a
// dropdown in a list row makes it far too easy to reclassify the wrong lead
// with a stray click, and there is no note recorded to explain why.
//
// Mobile and WhatsApp are not shown either: the client name is the way in, so
// contact details are read on the detail page where opening the lead also marks
// it as picked up.

type Props = { lead: Lead; duplicateReview?: boolean; showArrivalStatus?: boolean };

const SOURCE_LABELS: Record<string, string> = {
  web: "Website form",
  recovered: "Recovered form",
  manual_walk_in: "Walk-in",
  manual_phone_call: "Phone call",
  manual_whatsapp: "WhatsApp / message",
  manual_other: "Other",
};

export const LeadRow = memo(function LeadRow({ lead, duplicateReview = false, showArrivalStatus = false }: Props) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-2/50">
      <td className="py-3 pr-4">
        <div className="flex flex-col gap-1">
          <Link href={`/admin/leads/${lead.id}`} className="text-text hover:text-gold">
            {lead.fullName || "Customer"}
          </Link>
          {duplicateReview && (
            <span className={lead.isDuplicate ? "text-[11px] font-medium text-warning" : "text-[11px] text-text-faint"}>
              {lead.isDuplicate ? "Flagged repeat submission" : "Earlier matching submission"}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4 text-text-muted">
        {lead.year} {lead.make} {lead.model}
      </td>
      <td className="py-3 pr-4 text-text-muted">{SOURCE_LABELS[lead.source ?? "web"] ?? "Other"}</td>
      <td className="py-3 pr-4 text-text-muted">{lead.mileageKm.toLocaleString()} km</td>
      <td className="py-3 pr-4 text-text-muted">{lead.location || "—"}</td>
      <td className="py-3 pr-4 text-text-muted">{formatDate(lead.createdAt)}</td>
      <td className="py-3 pr-4 text-text-muted">{formatAed(lead.estimatedValueAed)}</td>
      <td className="py-3 pr-4">
        <StatusPill status={lead.status} />
      </td>
      {showArrivalStatus && (
        <td className="py-3 pr-4">
          {lead.arrivalStatus === "arrived" ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Arrived
            </span>
          ) : (
            <span className="text-xs text-text-faint">
              Not yet arrived
            </span>
          )}
        </td>
      )}
    </tr>
  );
});
