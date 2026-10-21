"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CarFront,
  Coins,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

import { FinancialTrendChart } from "@/components/admin/FinancialTrendChart";
import { PipelineFunnelChart } from "@/components/admin/ExecutiveCharts";
import { VisitorsChart } from "@/components/admin/VisitorsChart";
import { SubmissionsChart } from "@/components/admin/SubmissionsChart";

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs sm:text-sm text-amber-200/90 shadow-lg">
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

  const regularCarsSold = Math.max(0, data.financial.carsSold - (data.scrap?.sold ?? 0));
  const scrapCarsSold = data.scrap?.sold ?? 0;

  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setChartsReady(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveKpiCard
          label="Revenue"
          value={formatAed(data.financial.revenue)}
          subDetail={<span className="text-amber-400/90 font-medium tracking-wide">Overall (Regular + Scrap)</span>}
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
          subDetail={<span className="text-emerald-400/90 font-medium tracking-wide">Overall (Regular + Scrap)</span>}
          detail="Sale price minus acquisition cost"
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
          subDetail={
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="text-blue-300">{regularCarsSold} regular</span>
              <span className="text-white/20">·</span>
              <span className="text-amber-400">{scrapCarsSold} scrap</span>
            </span>
          }
          detail="Completed sales (Overall)"
          comparisonValue={previous ? `${previous.carsSold.toLocaleString()} cars` : undefined}
          change={previous ? financialChange(previous.carsSold, data.financial.carsSold) : undefined}
          isLoading={isLoading}
          icon={CarFront}
          accent="blue"
        />
        <ExecutiveKpiCard
          label="Staff Commission to Pay"
          value={formatAed(data.financial.staffCommissionOwed)}
          subDetail={<span className="text-purple-400/90 font-medium tracking-wide">All sales (Regular + Scrap)</span>}
          detail="Commission not yet paid"
          comparisonValue={previous ? formatAed(previous.staffCommissionOwed) : undefined}
          change={previous ? financialChange(previous.staffCommissionOwed, data.financial.staffCommissionOwed) : undefined}
          isLoading={isLoading}
          icon={WalletCards}
          accent="purple"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        {chartsReady ? (
          <FinancialTrendChart data={data.trend} comparisonData={data.comparisonOverview?.trend} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
        ) : (
          <ChartPlaceholder title="Sales and Profit" className="h-[22rem]" />
        )}
        {chartsReady ? (
          <PipelineFunnelChart data={data.pipeline} comparisonData={data.comparisonOverview?.pipeline} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
        ) : (
          <ChartPlaceholder title="Lead Journey" className="h-[22rem]" />
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartsReady ? (
          <VisitorsChart data={data.trend} comparisonData={data.comparisonOverview?.trend} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
        ) : (
          <ChartPlaceholder title="Website Visitors" className="h-48" />
        )}
        {chartsReady ? (
          <SubmissionsChart data={data.trend} comparisonData={data.comparisonOverview?.trend} periodLabel={label} comparisonPeriodLabel={comparisonPeriodLabel} isLoading={isLoading} />
        ) : (
          <ChartPlaceholder title="Car Submissions" className="h-48" />
        )}
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
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-fluid-0 text-text tracking-tight">{title}</h3>
        <span className="h-5 w-20 rounded-full bg-white/5" aria-hidden="true" />
      </div>
      <div className={cn("w-full animate-pulse rounded-lg bg-white/[0.03]", className)} />
    </Card>
  );
}


