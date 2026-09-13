"use client";

import { Check, Clock } from "lucide-react";

type Props = {
  arrivalStatus?: "not_arrived" | "arrived";
  canConfirmArrival: boolean;
  arrivalEligible: boolean;
  markingArrival: boolean;
  onConfirmArrival: () => Promise<void> | void;
  showCard: boolean;
};

export function LeadArrivalCard({
  arrivalStatus,
  canConfirmArrival,
  arrivalEligible,
  markingArrival,
  onConfirmArrival,
  showCard,
}: Props) {
  if (!showCard) return null;

  const isArrived = arrivalStatus === "arrived";

  if (canConfirmArrival) {
    return (
      <div className="rounded-card border border-border bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-text">Arrival Status</p>
              {isArrived && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <Check className="h-3 w-3" /> Confirmed
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {arrivalEligible
                ? "Confirm only when the customer has arrived at the facility for the scheduled inspection."
                : "Available after Inspection Scheduled is saved and a Purchaser has been assigned."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isArrived}
            disabled={!arrivalEligible || markingArrival || isArrived}
            onClick={() => void onConfirmArrival()}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              isArrived ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
                isArrived ? "translate-x-6" : "translate-x-1"
              }`}
            >
              {isArrived && <Check className="h-3.5 w-3.5 text-emerald-700" />}
            </span>
          </button>
        </div>
        <p
          className={`mt-3 text-xs font-medium ${
            isArrived ? "text-emerald-400" : "text-text-faint"
          }`}
        >
          {isArrived
            ? "Arrived — Purchaser can now see this confirmation."
            : "Not yet arrived"}
        </p>
      </div>
    );
  }

  // Purchaser or view-only staff
  return (
    <div
      className={`rounded-card border p-4 ${
        isArrived
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-border bg-surface-2"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isArrived
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {isArrived ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <p
              className={`text-sm font-semibold ${
                isArrived ? "text-emerald-300" : "text-text"
              }`}
            >
              {isArrived ? "Customer Has Arrived" : "Customer Arrival Status"}
            </p>
            <p className="text-xs text-text-muted">
              {isArrived
                ? "Checked in by Customer Service. Customer is at the facility."
                : "Awaiting Customer Service check-in upon arrival at the facility."}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isArrived
              ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
              : "border border-zinc-700 bg-zinc-800 text-zinc-400"
          }`}
        >
          {isArrived ? "Ready for Inspection" : "Not Yet Arrived"}
        </span>
      </div>
    </div>
  );
}
