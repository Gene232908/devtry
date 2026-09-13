"use client";

import { Calendar, Check } from "lucide-react";
import { formatScheduledInspection } from "@/lib/format";

type Props = {
  scheduledInspectionAt: string | null;
  arrivalStatus?: "not_arrived" | "arrived";
};

export function LeadScheduledInspectionCard({
  scheduledInspectionAt,
  arrivalStatus,
}: Props) {
  if (!scheduledInspectionAt) return null;

  const isArrived = arrivalStatus === "arrived";

  return (
    <div className="flex flex-col gap-2 rounded-card border border-gold/40 bg-gold/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-gold text-sm">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>Scheduled Inspection</span>
        </div>
        {isArrived ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Arrived
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/90 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
            Not yet arrived
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-text">
        {formatScheduledInspection(scheduledInspectionAt)}
      </p>
      <p className="text-xs text-text-muted">
        {isArrived
          ? "Customer arrival confirmed. Ready for inspection and negotiation."
          : "Customer scheduled to visit facility for car inspection and negotiation."}
      </p>
    </div>
  );
}
