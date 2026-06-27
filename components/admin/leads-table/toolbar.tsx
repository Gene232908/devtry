import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LeadStatus } from "@/config/mock-data";
import { STATUS_LABEL } from "@/lib/format";
import { MAKES } from "@/config/vehicles";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  status: LeadStatus | "all";
  onStatus: (v: LeadStatus | "all") => void;
  make: string;
  onMake: (v: string) => void;
  onExport: () => void;
  count: number;
};

const STATUSES: (LeadStatus | "all")[] = ["all", "new", "pending", "contacted", "valuation_sent", "closed"];

export function LeadsToolbar({ search, onSearch, status, onStatus, make, onMake, onExport, count }: Props) {
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
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-fluid--1 text-text-faint">{count} leads</span>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>
    </div>
  );
}
