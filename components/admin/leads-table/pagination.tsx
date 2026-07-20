import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, pageSize, totalCount, onPageChange }: Props) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-fluid--1 text-text-faint">
        {totalCount === 0 ? "No leads" : `${start}–${end} of ${totalCount} leads`}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-fluid--1 text-text-faint">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-card border border-border text-text-muted",
              page <= 1 ? "opacity-40" : "hover:border-gold hover:text-gold",
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-card border border-border text-text-muted",
              page >= totalPages ? "opacity-40" : "hover:border-gold hover:text-gold",
            )}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
