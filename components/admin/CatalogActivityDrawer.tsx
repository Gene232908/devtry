"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CatalogActivityPanel, type CatalogActivity } from "@/components/admin/CatalogActivityPanel";

export function CatalogActivityDrawer({
  open,
  refreshKey,
  restoringId,
  onClose,
  onRestore,
}: {
  open: boolean;
  /** Changes after a catalog write while the drawer is open. */
  refreshKey: number;
  restoringId: string | null;
  onClose: () => void;
  onRestore: (event: CatalogActivity) => void;
}) {
  const [events, setEvents] = useState<CatalogActivity[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);
  const eventsRef = useRef<CatalogActivity[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const load = useCallback(async (reset: boolean) => {
    if (!open) return;
    setLoading(true);
    const id = ++requestId.current;
    const offset = reset ? 0 : eventsRef.current.length;
    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (appliedQuery) params.set("q", appliedQuery);
      const response = await fetch(`/api/admin/catalog/activity?${params}`, { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (id !== requestId.current || !response.ok || !body?.ok) return;
      const nextEvents = body.data.events as CatalogActivity[];
      setEvents((current) => {
        const next = reset ? nextEvents : [...current, ...nextEvents];
        eventsRef.current = next;
        return next;
      });
      setHasMore(Boolean(body.data.hasMore));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [appliedQuery, open]);

  useEffect(() => {
    if (open) void load(true);
  }, [open, appliedQuery, refreshKey, load]);

  function handleScroll(event: React.UIEvent<HTMLElement>) {
    const target = event.currentTarget;
    if (!loading && hasMore && target.scrollHeight - target.scrollTop - target.clientHeight < 180) {
      void load(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Catalog activity history">
      <button type="button" aria-label="Close activity history" className="absolute inset-0 bg-black/55" onClick={onClose} />
      <aside onScroll={handleScroll} className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-bg p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-text-faint">Vehicle Catalog</p>
            <h2 className="mt-1 font-display text-fluid-1 text-text">Activity history</h2>
          </div>
          <Button variant="ghost" size="sm" aria-label="Close activity history" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <label className="relative mb-4 block">
          <span className="sr-only">Search catalog activity</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={120}
            placeholder="Search date, make, model, trim, or staff member"
            className="min-h-11 w-full rounded-btn border border-border bg-surface-2 py-2 pl-10 pr-3 text-sm text-text outline-none placeholder:text-text-faint focus:border-gold"
          />
          <span className="mt-1 block text-xs text-text-faint">Dates: DD/MM/YYYY or YYYY-MM-DD</span>
        </label>

        <CatalogActivityPanel
          events={events}
          loading={loading && events.length === 0}
          loadingMore={loading && events.length > 0}
          hasMore={hasMore}
          restoringId={restoringId}
          onRestore={onRestore}
          onLoadMore={() => void load(false)}
        />
      </aside>
    </div>
  );
}
