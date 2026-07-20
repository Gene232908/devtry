import { Search, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LeadStatus } from "@/config/mock-data";
import { STATUS_LABEL } from "@/lib/format";
import { MAKES } from "@/config/vehicles";
import { AREAS_BY_EMIRATE } from "@/config/emirates-areas";
import { cn } from "@/lib/utils";

const EMIRATES = Object.keys(AREAS_BY_EMIRATE);

type Props = {
  search: string;
  onSearch: (v: string) => void;
  status: LeadStatus | "all";
  onStatus: (v: LeadStatus | "all") => void;
  make: string;
  onMake: (v: string) => void;
  emirate: string;
  onEmirate: (v: string) => void;
  onExport: () => void;
  count: number;
  isLive?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
};

const STATUSES: (LeadStatus | "all")[] = ["all", "new", "pending", "contacted", "valuation_sent", "closed"];

export function LeadsToolbar({
  search,
  onSearch,
  status,
  onStatus,
  make,
  onMake,
  emirate,
  onEmirate,
  onExport,
  count,
  isLive,
  isRefreshing,
  onRefresh,
}: Props) {
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

        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as LeadStatus | "all")}
          className="h-10 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:border-gold"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          value={make}
          onChange={(e) => onMake(e.target.value)}
          className="h-10 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:border-gold"
        >
          <option value="all">All makes</option>
          {MAKES.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={emirate}
          onChange={(e) => onEmirate(e.target.value)}
          className="h-10 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:border-gold"
        >
          <option value="all">All emirates</option>
          {EMIRATES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-fluid--1 text-text-faint">{count} leads</span>
        {isLive && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>
    </div>
  );
}
