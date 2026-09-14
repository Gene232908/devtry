import { useMemo } from "react";
import { Search, RefreshCw, UserPlus } from "lucide-react";
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
  count: number;
  isLive?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onCreateLead: () => void;
  /** Narrows the status filter to what that role's leads can ever be — an
   *  agent's list offering "Deal" or "Not Purchased" could never match one of
   *  their own leads. Owner roles (and demo/no-identity) still get every
   *  status. */
  role?: StaffRole;
};

const MAKE_OPTIONS = MAKES.map((m) => ({ value: m.name, label: m.name }));
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
  count,
  isLive,
  isRefreshing,
  onRefresh,
  onCreateLead,
  role,
}: Props) {
  // "valuation_sent" is retired and deliberately absent from the full list —
  // it is no longer a state a lead can be moved into, so offering it as a
  // filter would only ever return historical rows.
  //
  // There is no "all" entry either: with checkboxes, "all" is simply nothing
  // ticked, so an explicit option for it would be a second way to express the
  // same state and could contradict the boxes below it.
  const statusOptions = useMemo(
    () => filterStatusOptionsForRole(role).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
    [role],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name or number…"
            className="h-10 w-full rounded-card border border-border bg-surface-2 pl-9 pr-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
          />
        </div>

        <MultiSelect
          className="sm:w-44"
          options={statusOptions}
          selected={statuses}
          onChange={(v) => onStatuses(v as LeadStatus[])}
          allLabel="All statuses"
          noun="statuses"
        />

        {(role === "purchaser" || role === "admin" || role === "manager") && onArrivalStatuses && (
          <MultiSelect
            className="sm:w-44"
            options={[{ value: "arrived", label: "Arrived" }, { value: "not_arrived", label: "Not yet arrived" }]}
            selected={arrivalStatuses}
            onChange={onArrivalStatuses}
            allLabel="All arrival statuses"
            noun="arrival statuses"
          />
        )}

        <MultiSelect
          className="sm:w-40"
          options={MAKE_OPTIONS}
          selected={makes}
          onChange={onMakes}
          allLabel="All makes"
          noun="makes"
        />

        <MultiSelect
          className="sm:w-44"
          options={EMIRATE_OPTIONS}
          selected={emirates}
          onChange={onEmirates}
          allLabel="All emirates"
          noun="emirates"
        />

        {hasFilters && (
          // One reset for all three, so clearing a stacked filter is not three
          // separate trips into three separate panels.
          <button
            type="button"
            onClick={onClearFilters}
            className="h-10 shrink-0 whitespace-nowrap px-1 text-fluid--1 text-text-muted transition-colors hover:text-gold"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-fluid--1 text-text-faint">{count} leads</span>
        {isLive && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        )}
        {(role === "admin" || role === "call_center" || !role) && (
          <Button size="sm" onClick={onCreateLead}>
            <UserPlus className="h-4 w-4" />
            Add lead
          </Button>
        )}
        <ExportMenu onPdf={onExportPdf} onExcel={onExportExcel} />
      </div>
    </div>
  );
}
