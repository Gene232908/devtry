"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const CATALOG_MODELS_PER_PAGE = 15;

export function CatalogPagination({
  page,
  totalItems,
  onPage,
}: {
  page: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / CATALOG_MODELS_PER_PAGE),
  );
  if (totalPages <= 1) return null;
  const first = (page - 1) * CATALOG_MODELS_PER_PAGE + 1;
  const last = Math.min(page * CATALOG_MODELS_PER_PAGE, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
      <p className="text-fluid--1 text-text-faint">
        Showing {first}–{last} of {totalItems} models
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="min-w-20 text-center text-fluid--1 text-text-muted">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
