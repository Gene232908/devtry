import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  /**
   * The explanation. Hidden behind the info button rather than printed under
   * the number.
   *
   * Twelve cards each carrying a sentence turned the Overview into a wall of
   * prose that had to be read past to reach the figures — and the sentences are
   * only needed once, while learning what a stage means. Behind an icon they
   * stay available and stop competing with the numbers.
   */
  hint?: string;
  icon: LucideIcon;
  accent?: boolean;
  isLoading?: boolean;
  /** Rendered under the value. Used for the visitor reset countdown. */
  footer?: React.ReactNode;
};

export function StatCard({ label, value, hint, icon: Icon, accent, isLoading, footer }: Props) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-7 w-20" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-fluid--1 text-text-muted">{label}</span>
        {/* The icon identifies the card; the info button explains it. Kept as
            two separate marks so the tooltip has a real, focusable target of its
            own rather than making the decorative icon interactive. */}
        <span className="flex shrink-0 items-center gap-1">
          {hint && <InfoTip text={hint} />}
          <Icon className={cn("h-5 w-5", accent ? "text-gold" : "text-text-faint")} />
        </span>
      </div>
      <span className="font-display text-fluid-3 tabular-nums text-text">{value}</span>
      {footer}
    </Card>
  );
}
