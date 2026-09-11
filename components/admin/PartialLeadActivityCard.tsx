import { Card } from "@/components/ui/Card";
import { type PartialLeadActivity } from "@/lib/admin/partial-lead";
import { STATUS_LABEL } from "@/lib/format";
import { LeadStatus } from "@/config/mock-data";

type Props = {
  createdAt: string;
  activities: PartialLeadActivity[];
};

export function PartialLeadActivityCard({ createdAt, activities }: Props) {
  const totalCount = activities.length + 1;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-base font-semibold text-text">Activity History</h3>
        <span className="text-xs font-medium text-text-muted">
          {totalCount} {totalCount === 1 ? "event" : "events"}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {activities.map((activity) => (
          <li key={activity.id} className="flex gap-3 text-sm">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            <div>
              <p className="text-text font-medium">{activityMessage(activity)}</p>
              <p className="text-xs text-text-muted mt-0.5">{formatActivityTimestamp(activity.created_at)}</p>
            </div>
          </li>
        ))}

        <li className="flex gap-3 text-sm">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          <div>
            <p className="text-text font-medium">Incomplete valuation captured</p>
            <p className="text-xs text-text-muted mt-0.5">{formatActivityTimestamp(createdAt)}</p>
          </div>
        </li>
      </ul>
    </Card>
  );
}

function formatActivityTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityMessage(activity: PartialLeadActivity): string {
  if (activity.type === "status_changed") {
    return `Status changed from ${STATUS_LABEL[activity.meta.from as LeadStatus] ?? activity.meta.from ?? "unknown"} to ${STATUS_LABEL[activity.meta.to as LeadStatus] ?? activity.meta.to ?? "unknown"}`;
  }
  if (activity.type === "assigned") {
    return "Assigned to Call Centre for follow-up";
  }
  return "Follow-up note updated";
}
