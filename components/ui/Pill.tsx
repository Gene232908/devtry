import { cn } from "@/lib/utils";
import { LeadStatus } from "@/config/mock-data";
import { STATUS_LABEL } from "@/lib/format";

// Colour tracks progress through the pipeline: blue on arrival, orange while
// waiting, green once contact is made, then warming into gold as the car gets
// closer to being bought.
//
// Gold is reserved for the late, valuable stages and is at its most solid on
// "deal". Nothing early in the pipeline may use it — "pending" in particular
// used to render in a --warning that was almost the same value as --gold, so
// an untouched lead looked like a bought car at a glance.
const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-info/15 text-info",
  pending: "bg-warning/15 text-warning",
  contacted: "bg-success/15 text-success",
  inspection_scheduled: "bg-success/15 text-success",
  no_show: "bg-danger/15 text-danger",
  inspected: "bg-gold/15 text-gold",
  negotiating: "bg-gold/15 text-gold",
  // The win state — the only one given the solid gold treatment.
  deal: "bg-gold/25 text-gold",
  closed: "bg-text-faint/15 text-text-muted",
  valuation_sent: "bg-gold/15 text-gold",
};

const STATUS_DOT: Record<LeadStatus, string> = {
  new: "bg-info",
  pending: "bg-warning",
  contacted: "bg-success",
  inspection_scheduled: "bg-success",
  no_show: "bg-danger",
  inspected: "bg-gold",
  negotiating: "bg-gold",
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
