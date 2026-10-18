import { useMemo } from "react";
import { Search, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { LeadStatus } from "@/config/mock-data";
import { STATUS_LABEL } from "@/lib/format";
import { filterStatusOptionsForRole } from "@/lib/admin/use-leads-filter";
import type { StaffRole } from "@/lib/auth/permissions";
import { MAKES } from "@/config/vehicles";
import { AREAS_BY_EMIRATE } from "@/config/emirates-areas";
import { cn } from "@/lib/utils";
import { ExportMenu } from "@/components/admin/ExportMenu";

const EMIRATES = Object.keys(AREAS_BY_EMIRATE);

type Props = {
  search: string;
  onSearch: (v: string) => void;
  statuses: LeadStatus[];
  onStatuses: (v: LeadStatus[]) => void;
  makes: string[];
  onMakes: (v: string[]) => void;
  emirates: string[];
  onEmirates: (v: string[]) => void;
  arrivalStatuses?: string[];
  onArrivalStatuses?: (v: string[]) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onExportPdf: () => void | Promise<void>;
  onExportExcel: () => void;
  count?: number;
  isLive?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onCreateLead?: () => void;
  /** Narrows the status filter to what that role's leads can ever be. */
  role?: StaffRole;
  /** Dynamically sourced make names from the Vehicle Catalog + loaded leads. */
  availableMakes?: string[];
};

const EMIRATE_OPTIONS = EMIRATES.map((e) => ({ value: e, label: e }));

export function LeadsToolbar({
  search,
  onSearch,
  statuses,
  onStatuses,
  makes,
  onMakes,
  emirates,
  onEmirates,
  arrivalStatuses = [],
  onArrivalStatuses,
  hasFilters,
  onClearFilters,
  onExportPdf,
  onExportExcel,
  isLive,
  isRefreshing,
  onRefresh,
  role,
  availableMakes,
}: Props) {
  const statusOptions = useMemo(
    () => filterStatusOptionsForRole(role).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
    [role],
  );

  const makeOptions = useMemo(() => {
    const list = availableMakes && availableMakes.length > 0
      ? availableMakes
      : MAKES.map((m) => m.name);
    return list.map((name) => ({ value: name, label: name }));
  }, [availableMakes]);

  return (
    <div className="flex flex-col gap-3">
      {/* Tier 1: Search and Action Controls */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name or number…"
            className="h-10 w-full rounded-card border border-border bg-surface-2 pl-9 pr-8 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          {isLive && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-9 px-3">
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              <span className="hidden xs:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
            </Button>
          )}
          <ExportMenu onPdf={onExportPdf} onExcel={onExportExcel} />
        </div>
      </div>

      {/* Tier 2: Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <MultiSelect
          className="w-full xs:w-[calc(50%-4px)] sm:w-auto sm:min-w-[145px]"
          options={statusOptions}
          selected={statuses}
          onChange={(v) => onStatuses(v as LeadStatus[])}
          allLabel="All statuses"
          noun="statuses"
        />

        {(role === "purchaser" || role === "admin" || role === "manager") && onArrivalStatuses && (
          <MultiSelect
            className="w-full xs:w-[calc(50%-4px)] sm:w-auto sm:min-w-[150px]"
            options={[{ value: "arrived", label: "Arrived" }, { value: "not_arrived", label: "Not yet arrived" }]}
            selected={arrivalStatuses}
            onChange={onArrivalStatuses}
            allLabel="All arrival statuses"
            noun="arrival statuses"
          />
        )}

        <MultiSelect
          className="w-full xs:w-[calc(50%-4px)] sm:w-auto sm:min-w-[135px]"
          options={makeOptions}
          selected={makes}
          onChange={onMakes}
          allLabel="All makes"
          noun="makes"
          searchable
        />

        <MultiSelect
          className="w-full xs:w-[calc(50%-4px)] sm:w-auto sm:min-w-[140px]"
          options={EMIRATE_OPTIONS}
          selected={emirates}
          onChange={onEmirates}
          allLabel="All emirates"
          noun="emirates"
        />

        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 shrink-0 whitespace-nowrap px-2.5 text-xs font-medium text-text-muted transition-colors hover:text-gold"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
