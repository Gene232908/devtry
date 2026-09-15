"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/Pill";
import { Lead } from "@/config/mock-data";
import { formatDate } from "@/lib/format";

type Props = {
  leads: Lead[];
  duplicateReview?: boolean;
  emptyMessage?: string;
};

export function MobileLeadsList({
  leads,
  duplicateReview = false,
  emptyMessage = "No leads match your filters.",
}: Props) {
  if (leads.length === 0) {
    return (
      <div className="py-10 text-center text-fluid--1 text-text-faint rounded-xl border border-white/[0.08] bg-surface-1/40">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1 text-xs text-text-faint">
        <span className="font-semibold uppercase tracking-wider text-text-muted">
          Client Name Directory
        </span>
        <span>Tap name to open details</span>
      </div>

      <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-surface-1/40 overflow-hidden shadow-lg">
        {leads.map((lead) => {
          const clientName = lead.fullName?.trim() || "Valuation Customer";
          const carSummary = lead.make ? `${lead.year} ${lead.make} ${lead.model}` : "Vehicle details pending";

          return (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}`}
              className="group flex items-center justify-between p-3.5 sm:p-4 transition-all hover:bg-white/[0.03] active:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 font-display text-sm font-bold shadow-inner group-hover:border-gold/50 group-hover:scale-105 transition-all">
                  {clientName.charAt(0).toUpperCase()}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-text text-sm sm:text-base group-hover:text-gold transition-colors truncate">
                    {clientName}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-text-faint truncate mt-0.5">
                    <span className="truncate text-text-muted">{carSummary}</span>
                    <span>•</span>
                    <span className="shrink-0">{formatDate(lead.createdAt)}</span>
                  </div>

                  {duplicateReview && lead.isDuplicate && (
                    <span className="text-[10px] font-medium text-warning mt-0.5">
                      Flagged duplicate
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end gap-1">
                  <StatusPill status={lead.status} />
                  {lead.arrivalStatus === "arrived" && (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      Arrived
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-gold transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
