"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ReceiptText,
  Search,
  Download,
  RotateCw,
  X,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { formatUaeDateTime } from "@/lib/uae-time";
import {
  type CompanyExpenseItem,
  type ExpensesSummary,
  type ExpensePeriodFilter,
  filterExpensesByPeriod,
  formatExpenseCsv,
  downloadExpensesPdf,
} from "@/lib/admin/expenses";

const PAGE_SIZE = 10;
type SortField = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

type Props = {
  initialItems: CompanyExpenseItem[];
  initialSummary: ExpensesSummary;
  initialError: string | null;
};

export default function ExpensesClient({
  initialItems,
  initialSummary,
  initialError,
}: Props) {
  const [items, setItems] = useState<CompanyExpenseItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | "valuation" | "scrap">("all");
  const [periodFilter, setPeriodFilter] = useState<ExpensePeriodFilter>("monthly");
  const [sortBy, setSortBy] = useState<SortField>("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<CompanyExpenseItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/expenses", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body?.error?.message ?? "Failed to refresh expenses.");
      setItems(body.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh expenses.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleExportCsv() {
    // Add UTF-8 Byte Order Mark (\uFEFF) so Excel properly parses columns
    const csvData = "\uFEFF" + formatExpenseCsv(filteredItems);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `CarVibe_Expenses_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Unified Export Dropdown states
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleExportPdf() {
    setIsExportingPdf(true);
    try {
      await downloadExpensesPdf(filteredItems, {
        periodLabel,
        totalAed: activeTotalAed,
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleExportExcel() {
    handleExportCsv();
  }

  // Filter items by origin, time period (Day, Weekly, Monthly, Yearly), and search query
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (originFilter !== "all") {
      result = result.filter((item) => item.vehicle.inquiryType === originFilter);
    }

    result = filterExpensesByPeriod(result, periodFilter);

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((item) => {
        const carStr = `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model} ${item.vehicle.trim ?? ""} ${item.vehicle.chassisNumber ?? ""}`.toLowerCase();
        const descStr = item.description.toLowerCase();
        const staffStr = `${item.createdByName} ${item.createdByRole ?? ""}`.toLowerCase();
        const custStr = (item.customerName ?? "").toLowerCase();
        return carStr.includes(term) || descStr.includes(term) || staffStr.includes(term) || custStr.includes(term);
      });
    }

    result.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "date_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "amount_desc") return b.amountAed - a.amountAed;
      if (sortBy === "amount_asc") return a.amountAed - b.amountAed;
      return 0;
    });

    return result;
  }, [items, search, originFilter, periodFilter, sortBy]);

  const activeTotalAed = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + it.amountAed, 0);
  }, [filteredItems]);

  const uniqueActiveVehicles = useMemo(() => {
    return new Set(filteredItems.map((it) => it.inventoryId)).size;
  }, [filteredItems]);

  // Pagination calculation (Max 10 per page)
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, safePage]);

  // Expenses for the vehicle selected in the detail modal
  const vehicleBreakdownExpenses = useMemo(() => {
    if (!selectedExpense) return [];
    return items.filter(
      (it) =>
        it.inventoryId === selectedExpense.inventoryId ||
        (selectedExpense.leadId && it.leadId === selectedExpense.leadId)
    );
  }, [items, selectedExpense]);

  const vehicleBreakdownTotalAed = useMemo(() => {
    return vehicleBreakdownExpenses.reduce((acc, it) => acc + it.amountAed, 0);
  }, [vehicleBreakdownExpenses]);

  const periodLabel = useMemo(() => {
    if (periodFilter === "day") return "Today's";
    if (periodFilter === "weekly") return "This Week's";
    if (periodFilter === "monthly") return `This Month's (${initialSummary.thisMonthLabel || "Current Month"})`;
    if (periodFilter === "yearly") return "This Year's";
    return "All-Time";
  }, [periodFilter, initialSummary.thisMonthLabel]);

  const resetFilters = () => {
    setSearch("");
    setOriginFilter("all");
    setPeriodFilter("monthly");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header with Integrated Executive Summary & Action Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-text font-display">Vehicle Expenses</h1>
            <span className="inline-flex items-center rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">
              {filteredItems.length} {filteredItems.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Aggregated vehicle-specific operational costs, towing, RTA inspections, and maintenance across all deals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Integrated Luxury Total Widget — Zero Empty Space */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141417] px-3.5 py-2 shadow-sm transition-all hover:border-amber-400/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-400">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#a39c90]">
                {periodLabel} Total
              </div>
              <div className="flex items-baseline gap-1.5 font-sans mt-0.5">
                <span className="text-xs font-semibold text-[#a39c90]">AED</span>
                <span className="text-lg sm:text-xl font-bold tracking-tight tabular-nums text-text">
                  {formatNumber(activeTotalAed)}
                </span>
                <span className="text-[11px] text-text-muted ml-1">
                  • {uniqueActiveVehicles} {uniqueActiveVehicles === 1 ? "vehicle" : "vehicles"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 gap-1.5 border-border bg-surface text-xs font-medium text-text hover:bg-surface-elevated"
            >
              <RotateCw className={`h-3.5 w-3.5 text-text-muted ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {/* Single Unified Export Button with Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => setIsExportMenuOpen((open) => !open)}
                disabled={isExportingPdf || filteredItems.length === 0}
                className="h-10 gap-1.5 text-xs font-semibold text-surface-dark shadow-sm transition hover:brightness-105"
                aria-haspopup="true"
                aria-expanded={isExportMenuOpen}
              >
                <Download className={`h-3.5 w-3.5 ${isExportingPdf ? "animate-bounce" : ""}`} />
                {isExportingPdf ? "Generating PDF..." : "Export"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", isExportMenuOpen && "rotate-180")} />
              </Button>

              {isExportMenuOpen && (
                <div className="absolute right-0 z-30 mt-1.5 w-52 rounded-lg border border-border/80 bg-surface-2 p-1.5 shadow-2xl animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      void handleExportPdf();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-text hover:bg-surface transition-colors"
                  >
                    <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-text">PDF Document (.pdf)</div>
                      <div className="text-[10px] text-text-muted">Clean balanced data only</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExportExcel();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-text hover:bg-surface transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-text">Excel Spreadsheet (.csv)</div>
                      <div className="text-[10px] text-text-muted">Microsoft Excel formatted</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Filter and Search Bar: Day, Weekly, Monthly, Yearly + Origins + Search */}
      <Card className="border border-border bg-surface p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search make, model, chassis, description, or staff..."
              className="h-10 pl-9 pr-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time Period Filter Dropdown */}
            <div className="relative">
              <select
                id="expenses-period-filter"
                aria-label="Filter by time period"
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value as ExpensePeriodFilter);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-lg border border-border/80 bg-surface-2 pl-3.5 pr-8 text-xs font-semibold text-text focus:border-gold focus:outline-none cursor-pointer appearance-none transition"
              >
                <option value="day" className="bg-[#141416] text-text">Day</option>
                <option value="weekly" className="bg-[#141416] text-text">Weekly</option>
                <option value="monthly" className="bg-[#141416] text-text">Monthly</option>
                <option value="yearly" className="bg-[#141416] text-text">Yearly</option>
                <option value="all" className="bg-[#141416] text-text">All Time</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            </div>

            {/* Origin Filter: All Origins, Valuation, Scrap */}
            <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs">
              {(["all", "valuation", "scrap"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setOriginFilter(mode);
                    setCurrentPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 font-medium capitalize transition ${
                    originFilter === mode ? "bg-surface-elevated text-text font-semibold border border-border" : "text-text-muted hover:text-text"
                  }`}
                >
                  {mode === "all" ? "All Origins" : mode}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="h-10 rounded-lg border border-border/80 bg-surface-2 pl-3.5 pr-8 text-xs font-semibold text-text focus:border-gold focus:outline-none cursor-pointer appearance-none transition"
              >
                <option value="date_desc" className="bg-[#141416] text-text">Newest First</option>
                <option value="date_asc" className="bg-[#141416] text-text">Oldest First</option>
                <option value="amount_desc" className="bg-[#141416] text-text">Amount (High to Low)</option>
                <option value="amount_asc" className="bg-[#141416] text-text">Amount (Low to High)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            </div>

            {(search || originFilter !== "all" || periodFilter !== "monthly") && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-10 text-xs px-3"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Table / Cards */}
      {filteredItems.length === 0 ? (
        <Card className="border border-border bg-surface p-12 text-center shadow-sm">
          <ReceiptText className="mx-auto h-10 w-10 text-text-muted" />
          <h3 className="mt-3 text-base font-semibold text-text">No expenses found</h3>
          <p className="mt-1 text-sm text-text-muted">Try adjusting your search query, origin filter, or time period.</p>
          <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="mt-4">
            Reset Filters
          </Button>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden rounded-xl border border-border bg-surface md:block overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text border-collapse">
                <thead className="border-b border-border bg-surface-elevated text-xs uppercase tracking-wider text-text-muted font-mono">
                  <tr>
                    <th scope="col" className="py-3.5 px-4">Date</th>
                    <th scope="col" className="py-3.5 px-4">Vehicle Details</th>
                    <th scope="col" className="py-3.5 px-4">Type</th>
                    <th scope="col" className="py-3.5 px-4">Action</th>
                    <th scope="col" className="py-3.5 px-4">Logged By</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Amount (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-elevated/40 transition">
                      {/* Date */}
                      <td className="whitespace-nowrap py-3.5 px-4 text-xs font-mono text-text-muted">
                        {formatUaeDateTime(item.createdAt)}
                      </td>

                      {/* Vehicle Details with exact clickable name linking to customer record */}
                      <td className="py-3.5 px-4">
                        {item.leadId ? (
                          <Link
                            href={`/admin/leads/${item.leadId}${item.vehicle.inquiryType === "scrap" ? "?origin=scrap" : ""}`}
                            className="font-semibold text-text hover:text-gold transition-colors inline-flex items-center gap-1.5 group"
                            title="Click to view customer record"
                          >
                            <span>{item.vehicle.year} {item.vehicle.make} {item.vehicle.model}</span>
                            <ExternalLink className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity text-gold shrink-0" />
                          </Link>
                        ) : (
                          <div className="font-semibold text-text">
                            {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                          {item.vehicle.trim && <span>{item.vehicle.trim}</span>}
                          {item.vehicle.chassisNumber && (
                            <span className="font-mono text-[10px] bg-background/80 px-1.5 py-0.5 rounded border border-border">
                              {item.vehicle.chassisNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Origin Type */}
                      <td className="whitespace-nowrap py-3.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          item.vehicle.inquiryType === "scrap"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-gold/15 text-gold border border-gold/30"
                        }`}>
                          {item.vehicle.inquiryType === "scrap" ? "Scrap" : "Valuation"}
                        </span>
                      </td>

                      {/* Action column with Eye / View Breakdown button */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedExpense(item)}
                          className="h-8 gap-1.5 border-border bg-surface-2/60 text-xs text-text hover:border-gold/40 hover:bg-gold/10 hover:text-gold transition"
                          title="Click to view all expenses and summarization for this vehicle"
                        >
                          <Eye className="h-3.5 w-3.5 text-gold" />
                          <span>View Breakdown</span>
                        </Button>
                      </td>

                      {/* Logged By */}
                      <td className="whitespace-nowrap py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 text-[10px] font-bold text-gold">
                            {item.createdByName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="text-xs font-medium text-text">{item.createdByName}</div>
                            {item.createdByRole && <div className="text-[10px] uppercase text-text-muted font-mono">{item.createdByRole}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="whitespace-nowrap py-3.5 px-4 text-right font-mono text-base font-bold text-gold">
                        {formatNumber(item.amountAed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border/80 bg-[#141417]">
                  <tr>
                    <td colSpan={5} className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-[#a39c90]">
                      Total {periodLabel} Operational Expenses ({filteredItems.length} {filteredItems.length === 1 ? "entry" : "entries"} across {uniqueActiveVehicles} {uniqueActiveVehicles === 1 ? "vehicle" : "vehicles"})
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-base font-bold text-gold whitespace-nowrap">
                      {formatNumber(activeTotalAed)} <span className="text-xs font-semibold text-amber-300">AED</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Controls (Max 10 per page) */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface-elevated/40 text-xs text-text-muted">
                <div>
                  Showing <span className="font-semibold text-text">{(safePage - 1) * PAGE_SIZE + 1}</span> to{" "}
                  <span className="font-semibold text-text">{Math.min(safePage * PAGE_SIZE, totalItems)}</span> of{" "}
                  <span className="font-semibold text-text">{totalItems}</span> entries
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <Button
                      key={num}
                      variant={safePage === num ? "gold" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(num)}
                      className={`h-8 w-8 p-0 font-medium ${safePage === num ? "font-bold text-surface-dark" : "text-text"}`}
                    >
                      {num}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 p-0"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Total Summary */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#141417] px-4 py-3 md:hidden">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#a39c90]">
                {periodLabel} Total
              </div>
              <div className="text-xs text-text-muted">
                {filteredItems.length} {filteredItems.length === 1 ? "entry" : "entries"} across {uniqueActiveVehicles} {uniqueActiveVehicles === 1 ? "vehicle" : "vehicles"}
              </div>
            </div>
            <div className="font-mono text-base font-bold text-gold">
              {formatNumber(activeTotalAed)} <span className="text-xs font-semibold text-amber-300">AED</span>
            </div>
          </div>

          {/* Mobile Card View with Pagination */}
          <div className="space-y-3 md:hidden">
            {paginatedItems.map((item) => (
              <Card key={item.id} className="border border-border bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mb-1 ${
                      item.vehicle.inquiryType === "scrap"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-gold/15 text-gold border border-gold/30"
                    }`}>
                      {item.vehicle.inquiryType === "scrap" ? "Scrap" : "Valuation"}
                    </span>
                    {item.leadId ? (
                      <Link
                        href={`/admin/leads/${item.leadId}${item.vehicle.inquiryType === "scrap" ? "?origin=scrap" : ""}`}
                        className="text-sm font-semibold text-text hover:text-gold transition-colors block"
                      >
                        {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                      </Link>
                    ) : (
                      <h4 className="text-sm font-semibold text-text">{item.vehicle.year} {item.vehicle.make} {item.vehicle.model}</h4>
                    )}
                    <span className="text-[11px] text-text-muted font-mono">{item.vehicle.chassisNumber ?? ""}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-gold">{formatNumber(item.amountAed)}</span>
                    <span className="block text-[10px] text-text-muted font-mono">AED</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                  <div className="text-xs text-text-muted font-mono">
                    {formatUaeDateTime(item.createdAt)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedExpense(item)}
                    className="h-7 text-xs gap-1 border-border px-2 text-gold"
                  >
                    <Eye className="h-3 w-3" />
                    <span>View</span>
                  </Button>
                </div>
              </Card>
            ))}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-2 text-xs text-text-muted">
                <span>Page {safePage} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Vehicle Expenses Summarization & Itemized Breakdown */}
      <Dialog
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        title="Vehicle Expenses Breakdown"
        className="max-w-2xl p-6"
      >
        {selectedExpense && (
          <div className="space-y-5 font-sans">
            {/* Vehicle Header Card */}
            <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {selectedExpense.leadId ? (
                  <Link
                    href={`/admin/leads/${selectedExpense.leadId}${selectedExpense.vehicle.inquiryType === "scrap" ? "?origin=scrap" : ""}`}
                    className="font-display text-lg font-bold text-text hover:text-gold transition-colors inline-flex items-center gap-1.5 group"
                    title="Open customer record"
                  >
                    <span>
                      {selectedExpense.vehicle.year} {selectedExpense.vehicle.make} {selectedExpense.vehicle.model}
                    </span>
                    <ExternalLink className="h-4 w-4 text-gold opacity-60 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ) : (
                  <h3 className="font-display text-lg font-bold text-text">
                    {selectedExpense.vehicle.year} {selectedExpense.vehicle.make} {selectedExpense.vehicle.model}
                  </h3>
                )}
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  selectedExpense.vehicle.inquiryType === "scrap"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-gold/15 text-gold border border-gold/30"
                }`}>
                  {selectedExpense.vehicle.inquiryType === "scrap" ? "Scrap Inquiry" : "Valuation Deal"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                {selectedExpense.vehicle.trim && <span>Trim: {selectedExpense.vehicle.trim}</span>}
                {selectedExpense.vehicle.chassisNumber && (
                  <span>Chassis: <span className="font-mono text-text">{selectedExpense.vehicle.chassisNumber}</span></span>
                )}
                {selectedExpense.customerName && (
                  <span>Customer: <strong className="text-text">{selectedExpense.customerName}</strong></span>
                )}
              </div>
            </div>

            {/* List of All Logged Expenses for this vehicle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Logged Expenses ({vehicleBreakdownExpenses.length})
                </h4>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-surface">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-border bg-surface-elevated text-text-muted font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description / Purpose</th>
                      <th className="py-2.5 px-3">Logged By</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {vehicleBreakdownExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-surface-elevated/40">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-text-muted">
                          {formatUaeDateTime(exp.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 text-text leading-relaxed">
                          {exp.description}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-text-muted">
                          <span className="font-medium text-text">{exp.createdByName}</span>
                          {exp.createdByRole && (
                            <span className="block text-[10px] uppercase font-mono text-text-muted">
                              {exp.createdByRole}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gold whitespace-nowrap">
                          {formatNumber(exp.amountAed)} AED
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summarization Card with generous padding & balanced typography */}
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Total Vehicle Expenses
                </span>
                <p className="text-xs text-text-muted mt-0.5">
                  Sum of all {vehicleBreakdownExpenses.length} operational costs logged for this car
                </p>
              </div>
              <div className="text-right">
                <div className="font-sans text-2xl font-bold tabular-nums text-gold tracking-tight">
                  {formatNumber(vehicleBreakdownTotalAed)} <span className="text-xs font-semibold text-amber-300">AED</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              {selectedExpense.leadId ? (
                <Link
                  href={`/admin/leads/${selectedExpense.leadId}${selectedExpense.vehicle.inquiryType === "scrap" ? "?origin=scrap" : ""}`}
                  className="rounded-btn border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                >
                  <span>Open Customer Record</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : <div />}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedExpense(null)}
                className="h-9 px-4 text-xs font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
