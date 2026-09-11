import { Card } from "@/components/ui/Card";
import {
  formatPartialDate,
  partialCarSummary,
  PARTIAL_STEP_LABELS,
  PARTIAL_TRIGGER_LABELS,
  type PartialLead,
} from "@/lib/admin/partial-lead";

type Props = {
  partial: PartialLead;
};

export function PartialLeadCapturedCard({ partial }: Props) {
  const carSummary = partialCarSummary(partial);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-text">Captured Details</h3>
          <p className="text-sm font-medium text-gold mt-0.5">{carSummary}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-4">
        <Detail label="Name" value={partial.full_name || "—"} />
        <Detail label="Captured Date" value={formatPartialDate(partial.created_at)} />
        <Detail
          label="Got as far as"
          value={PARTIAL_STEP_LABELS[partial.furthest_step] ?? `Step ${partial.furthest_step}`}
        />
        <Detail
          label="Captured by"
          value={partial.last_trigger ? (PARTIAL_TRIGGER_LABELS[partial.last_trigger] ?? partial.last_trigger) : "—"}
        />
        <Detail label="Car" value={carSummary} />
        <Detail
          label="Mileage"
          value={partial.mileage_km != null ? `${partial.mileage_km.toLocaleString()} km` : "—"}
        />
        <Detail label="Status" value={partial.status} />
        <Detail label="Source" value="Abandoned Form" />
      </div>

      {partial.description ? (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Seller&apos;s Description</p>
          <p className="mt-1.5 text-sm leading-relaxed text-text font-normal">{partial.description}</p>
        </div>
      ) : null}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-text">{value}</p>
    </div>
  );
}
