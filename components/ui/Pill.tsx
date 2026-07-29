import { cn } from "@/lib/utils";
import { LeadStatus } from "@/config/mock-data";
import { STATUS_LABEL } from "@/lib/format";

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-info/15 text-info",
  pending: "bg-warning/15 text-warning",
  contacted: "bg-success/15 text-success",
  inspected: "bg-gold/15 text-gold",
  // The win state — the only one given the solid gold treatment.
  deal: "bg-gold/25 text-gold",
  closed: "bg-text-faint/15 text-text-muted",
  valuation_sent: "bg-gold/15 text-gold",
};

const STATUS_DOT: Record<LeadStatus, string> = {
  new: "bg-info",
  pending: "bg-warning",
  contacted: "bg-success",
  inspected: "bg-gold",
  deal: "bg-gold",
  closed: "bg-text-faint",
  valuation_sent: "bg-gold",
};

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-fluid--1 font-medium whitespace-nowrap",
        STATUS_STYLE[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
