import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: boolean;
  isLoading?: boolean;
};

export function StatCard({ label, value, sublabel, icon: Icon, accent, isLoading }: Props) {
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
      <div className="flex items-center justify-between">
        <span className="text-fluid--1 text-text-muted">{label}</span>
        <Icon className={cn("h-5 w-5", accent ? "text-gold" : "text-text-faint")} />
      </div>
      <span className="font-display text-fluid-3 tabular-nums text-text">{value}</span>
      {sublabel && <span className="text-fluid--1 text-text-faint">{sublabel}</span>}
    </Card>
  );
}
