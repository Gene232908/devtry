import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  detail: string;
  change?: number | null;
  comparisonValue?: string;
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "gold" | "emerald" | "blue" | "purple";
  badge?: string;
};

const ACCENT_STYLES = {
  gold: {
    borderHover: "hover:border-amber-400/30",
    iconColor: "text-amber-400/90",
    iconBg: "bg-amber-400/10 border-amber-400/20",
  },
  emerald: {
    borderHover: "hover:border-emerald-400/30",
    iconColor: "text-emerald-400/90",
    iconBg: "bg-emerald-400/10 border-emerald-400/20",
  },
  blue: {
    borderHover: "hover:border-sky-400/30",
    iconColor: "text-sky-400/90",
    iconBg: "bg-sky-400/10 border-sky-400/20",
  },
  purple: {
    borderHover: "hover:border-violet-400/30",
    iconColor: "text-violet-400/90",
    iconBg: "bg-violet-400/10 border-violet-400/20",
  },
};

export function ExecutiveKpiCard({
  label,
  value,
  detail,
  change,
  comparisonValue,
  isLoading,
  icon: Icon,
  accent = "gold",
  badge,
}: Props) {
  if (isLoading) {
    return (
      <Card className="p-5 border-white/10 bg-[#141417]/80">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-9 w-36" />
        <Skeleton className="mt-3 h-4 w-44" />
      </Card>
    );
  }

  const positive = change !== undefined && change !== null && change > 0;
  const negative = change !== undefined && change !== null && change < 0;
  const theme = ACCENT_STYLES[accent] ?? ACCENT_STYLES.gold;

  // Split currency and number naturally so currency symbol doesn't overpower figures
  const hasCurrency = value.startsWith("AED ");
  const displayAmount = hasCurrency ? value.slice(4) : value;

  return (
    <Card
      className={cn(
        "group relative flex min-h-[154px] flex-col justify-between p-5 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200",
        theme.borderHover,
      )}
    >
      {/* Top Header: Natural Label & Accents */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#a39c90]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/25">
              {badge}
            </span>
          )}
          {Icon && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", theme.iconBg, theme.iconColor)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Primary Value: Natural, human-proportioned typography */}
      <div className="my-1.5 flex items-baseline gap-1.5 font-sans">
        {hasCurrency && (
          <span
            className={cn(
              "text-xs sm:text-sm font-semibold tracking-wider select-none",
              accent === "emerald" ? "text-emerald-400/70" : "text-[#a39c90]",
            )}
          >
            AED
          </span>
        )}
        <span
          className={cn(
            "text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums",
            accent === "emerald" ? "text-emerald-400" : "text-[#f5f3ef]",
          )}
        >
          {displayAmount}
        </span>
      </div>

      {/* Bottom Subtitle / Comparison */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs border-t border-white/[0.08] pt-2.5 text-[#a39c90]">
        {comparisonValue ? (
          <span className="truncate">
            <span className="text-[#a39c90]/80">Prior: </span>
            <span className="font-semibold text-white/90">{comparisonValue}</span>
          </span>
        ) : (
          <span className="truncate">{detail}</span>
        )}
        {change !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold shrink-0",
              positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-[#a39c90]",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : negative ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : null}
            {change === null ? "New" : `${positive ? "+" : ""}${change.toFixed(1)}%`}
          </span>
        )}
      </div>
    </Card>
  );
}
