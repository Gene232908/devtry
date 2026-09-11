"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  CarFront,
  Coins,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { OverviewDateFilter, type DateFilterValue } from "@/components/admin/OverviewDateFilter";
import { OverviewComparisonFilter } from "@/components/admin/OverviewComparisonFilter";
import { ExecutiveKpiCard } from "@/components/admin/ExecutiveKpiCard";
import {
  DataQualityPanel,
  FollowUpPanel,
  OperationalAlerts,
  StaffSummaryTable,
} from "@/components/admin/ExecutivePanels";
import { uaeDayKey } from "@/lib/uae-time";
import { financialChange, type OverviewRange } from "@/lib/admin/executive-overview";
import { useExecutiveOverview, type ExecutiveOverviewSeed } from "@/lib/admin/use-executive-overview";
import { cn } from "@/lib/utils";

// Recharts is the heaviest dashboard dependency. Keep it out of the initial
// dashboard bundle so headings, filters, KPI cards, and action panels become
// interactive before chart code is downloaded and measured.
const FinancialTrendChart = dynamic(
  () => import("@/components/admin/FinancialTrendChart").then((module) => module.FinancialTrendChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Sales and Profit" className="h-[22rem]" /> },
);
const PipelineFunnelChart = dynamic(
  () => import("@/components/admin/ExecutiveCharts").then((module) => module.PipelineFunnelChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Lead Journey" className="h-[22rem]" /> },
);
const VisitorsChart = dynamic(
  () => import("@/components/admin/VisitorsChart").then((module) => module.VisitorsChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Website Visitors" className="h-64" /> },
);
const SubmissionsChart = dynamic(
  () => import("@/components/admin/SubmissionsChart").then((module) => module.SubmissionsChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Car Submissions" className="h-64" /> },
);
const InventoryAgingChart = dynamic(
  () => import("@/components/admin/ExecutiveCharts").then((module) => module.InventoryAgingChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Time Cars Have Been in Stock" className="h-56" /> },
);
const StaffPerformanceChart = dynamic(
  () => import("@/components/admin/StaffPerformanceChart").then((module) => module.StaffPerformanceChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Staff Performance" className="h-64" /> },
);

function formatAed(value: number) {
  return `AED ${Math.round(value).toLocaleString("en-AE")}`;
}

function formatPeriodRange(range: OverviewRange) {
  const formatDay = (value: string) => new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

  return range.from === range.to
    ? formatDay(range.from)
    : `${formatDay(range.from)} – ${formatDay(range.to)}`;
}

function defaultFilter(): DateFilterValue {
  const today = uaeDayKey(new Date());
  return { preset: "today", from: today, to: today, label: "Today" };
}

export function ExecutiveDashboard({ seed }: { seed?: ExecutiveOverviewSeed }) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() => {
    if (seed) {
      const isSingleDay = seed.range.from === seed.range.to;
      return {
        preset: isSingleDay ? "today" : "week",
        ...seed.range,
        label: isSingleDay ? "Today" : "Last 7 Days",
      };
    }
    return defaultFilter();
  });
  const [comparison, setComparison] = useState<OverviewRange | undefined>();
  const range = useMemo<OverviewRange>(() => {
    if (dateFilter.from && dateFilter.to) return { from: dateFilter.from, to: dateFilter.to };
    const fallback = defaultFilter();
    return { from: fallback.from as string, to: fallback.to as string };
  }, [dateFilter.from, dateFilter.to]);
  const { data, isLoading, error, refresh } = useExecutiveOverview(range, comparison, seed);

  function updateFilter(next: DateFilterValue) {
    setDateFilter(next);
    // A comparison only makes sense against the same span. Clearing it avoids
    // silently leaving, for example, a one-day comparison beside a new month.
    setComparison(undefined);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-gold">
            Business dashboard
          </p>
          <h1 className="mt-1 font-display text-fluid-3 text-text">Business Overview</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">
            See sales, leads, cars in stock, and staff work in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OverviewComparisonFilter primaryRange={range} value={comparison} onChange={setComparison} disabled={isLoading} />
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            {isLoading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      <OverviewDateFilter value={dateFilter} onChange={updateFilter} isLoading={isLoading} />

      {comparison && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs sm:text-sm text-amber-200/90 backdrop-blur-md shadow-lg">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-amber-300">
              <CalendarRange className="h-4 w-4" />
              Active Comparison Mode
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-white/10 px-2.5 py-0.5 font-medium text-white border border-white/10">
                Primary: <strong className="text-white font-semibold">{dateFilter.from} → {dateFilter.to}</strong> {dateFilter.label ? `(${dateFilter.label})` : ""}
              </span>
              <span className="font-bold text-amber-400">vs</span>
              <span className="rounded-md bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 font-medium text-amber-200">
                Comparison: <strong className="text-amber-100 font-semibold">{comparison.from} → {comparison.to}</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-400/30 text-amber-200 hover:bg-amber-400/20 hover:text-white"
              onClick={() => setComparison(undefined)}
            >
              Clear Comparison ✕
            </Button>
          </div>
        </div>
      )}
      {error && (
        <Card className="border-danger/50 p-4 text-fluid--1 text-danger">
          {error}{" "}
          <button type="button" className="ml-2 underline" onClick={refresh}>
            Try again
          </button>
        </Card>
      )}

      {data ? (
        <DashboardData
          data={data}
          range={range}
          isLoading={isLoading}
          label={dateFilter.label}
          comparisonActive={Boolean(comparison)}
          comparisonPeriodLabel={comparison ? formatPeriodRange(comparison) : undefined}
        />
      ) : (
        <DashboardLoading />
      )}
    </div>
  );
}

function DashboardData({
  data,
  range,
  isLoading,
  label,
  comparisonActive,
  comparisonPeriodLabel,
}: {
  data: NonNullable<ReturnType<typeof useExecutiveOverview>["data"]>;
  range: OverviewRange;
  isLoading: boolean;
  label: string;
  comparisonActive: boolean;
  comparisonPeriodLabel?: string;
}) {
  const previous = data.comparison;
  const marginPercent =
    data.financial.revenue > 0
      ? ((data.financial.grossProfit / data.financial.revenue) * 100).toFixed(1)
      : null;
  const watchCount = data.inventoryAging[3]?.count ?? 0;

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveKpiCard
          label="Revenue"
          value={formatAed(data.financial.revenue)}
          detail={comparisonActive ? "vs selected comparison" : label}
          comparisonValue={previous ? formatAed(previous.revenue) : undefined}
          change={previous ? financialChange(previous.revenue, data.financial.revenue) : undefined}
          isLoading={isLoading}
          icon={Coins}
          accent="gold"
        />
        <ExecutiveKpiCard
          label="Gross Profit"
          value={formatAed(data.financial.grossProfit)}
          detail="Sale price minus what the car cost"
          comparisonValue={previous ? formatAed(previous.grossProfit) : undefined}
          change={previous ? financialChange(previous.grossProfit, data.financial.grossProfit) : undefined}
          isLoading={isLoading}
          icon={TrendingUp}
          accent="emerald"
          badge={marginPercent ? `${marginPercent}% margin` : undefined}
        />
        <ExecutiveKpiCard
          label="Cars Sold"
          value={data.financial.carsSold.toLocaleString()}
          detail="Completed sales"
          comparisonValue={previous ? `${previous.carsSold.toLocaleString()} cars` : undefined}
          change={previous ? financialChange(previous.carsSold, data.financial.carsSold) : undefined}
          isLoading={isLoading}
          icon={CarFront}
          accent="blue"
        />
        <ExecutiveKpiCard
          label="Staff Commission to Pay"
          value={formatAed(data.financial.staffCommissionOwed)}
          detail="Commission that has not been paid yet"
          comparisonValue={previous ? formatAed(previous.staffCommissionOwed) : undefined}
          change={previous ? financialChange(previous.staffCommissionOwed, data.financial.staffCommissionOwed) : undefined}
          isLoading={isLoading}
          icon={WalletCards}
          accent="purple"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        <FinancialTrendChart data={data.trend} comparisonData={data.comparisonOverview?.trend} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
        <PipelineFunnelChart data={data.pipeline} comparisonData={data.comparisonOverview?.pipeline} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VisitorsChart data={data.trend} comparisonData={data.comparisonOverview?.trend} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
        <SubmissionsChart data={data.trend} comparisonData={data.comparisonOverview?.trend} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Current stock value */}
        <Card className="flex flex-col justify-between p-5 border-white/10 bg-[#141417]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-emerald-500/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#a39c90]">
                Money in Cars for Sale
              </span>
              <p className="mt-0.5 text-xs text-[#a39c90]/80">Money spent on cars that are still for sale</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <WalletCards className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5 font-sans">
            <span className="text-xs sm:text-sm font-semibold tracking-wider text-[#a39c90] select-none">AED</span>
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-[#f5f3ef]">
              {Math.round(data.financial.cashInStock).toLocaleString("en-AE")}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.08] pt-2.5 text-xs text-[#a39c90]">
            <span>Cars waiting to be sold</span>
            <span className="font-semibold text-white">{data.financial.stockCount} cars</span>
          </div>
        </Card>

        {/* Average time in stock */}
        <Card className="flex flex-col justify-between p-5 border-white/10 bg-[#141417]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-sky-500/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#a39c90]">
                Average Time in Stock
              </span>
              <p className="mt-0.5 text-xs text-[#a39c90]/80">How long cars usually stay before being sold</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5 font-sans">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-[#f5f3ef]">
              {data.financial.averageStockDays}
            </span>
            <span className="text-xs sm:text-sm font-medium text-[#a39c90]">days</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.08] pt-2.5 text-xs text-[#a39c90]">
            <span>Based on the date each car was bought</span>
          </div>
        </Card>

        {/* Cars waiting too long */}
        <Card
          className={cn(
            "flex flex-col justify-between p-5 border-white/10 bg-[#141417]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200",
            watchCount > 0
              ? "hover:border-red-500/40"
              : "hover:border-white/20",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#a39c90]">
                Cars Waiting Too Long
              </span>
              <p className="mt-0.5 text-xs text-[#a39c90]/80">Cars still for sale after 90 days</p>
            </div>
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border",
                watchCount > 0
                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                  : "bg-white/5 border-white/10 text-gray-400",
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5 font-sans">
            <span
              className={cn(
                "text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums",
                watchCount > 0 ? "text-red-400" : "text-[#f5f3ef]",
              )}
            >
              {watchCount}
            </span>
            <span className="text-xs sm:text-sm font-medium text-[#a39c90]">vehicles</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.08] pt-2.5 text-xs">
            <span className={watchCount > 0 ? "text-red-400 font-medium" : "text-[#a39c90]"}>
              {watchCount > 0 ? "Check the price or follow up on these cars" : "No cars have been waiting over 90 days"}
            </span>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <InventoryAgingChart data={data.inventoryAging} comparisonData={data.comparisonOverview?.inventoryAging} isLoading={isLoading} />
        <StaffPerformanceChart data={data.staff} comparisonData={data.comparisonOverview?.staff} periodLabel={label} isLoading={isLoading} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <OperationalAlerts alerts={data.alerts} isLoading={isLoading} />
        <FollowUpPanel data={data.pipelineSnapshot} range={range} isLoading={isLoading} />
        <DataQualityPanel data={data.dataQuality} isLoading={isLoading} />
      </section>
      <StaffSummaryTable staff={data.staff} isLoading={isLoading} />
    </>
  );
}

function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="h-40 animate-pulse bg-surface-2 border-border/50" />
      ))}
    </div>
  );
}

function ChartPlaceholder({ title, className }: { title: string; className: string }) {
  return (
    <Card className="p-5 border-white/10 bg-[#141417]/80">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-fluid-0 text-text tracking-tight">{title}</h3>
        <span className="h-5 w-20 rounded-full bg-white/5" aria-hidden="true" />
      </div>
      <Skeleton className={cn("w-full", className)} />
    </Card>
  );
}
