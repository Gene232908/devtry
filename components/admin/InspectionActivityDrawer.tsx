"use client";

import { useCallback, useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type EventRow = { id: string; type: string; message: string; createdAt: string };
const INSPECTION_EVENT_TYPES = new Set(["inspection_card_updated", "inspection_photo_added", "inspection_photo_replaced", "inspection_completed", "inspection_photos_expired"]);

export function InspectionActivityDrawer({ leadId, refreshKey }: { leadId: string; refreshKey: number }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/events`, { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) throw new Error(body?.error?.message ?? "Couldn't load inspection activity.");
    setEvents((body.data.events as EventRow[]).filter((event) => INSPECTION_EVENT_TYPES.has(event.type)));
  }, [leadId]);

  useEffect(() => {
    if (!open) return;
    void load().catch((reason: Error) => setError(reason.message));
  }, [load, open, refreshKey]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><History className="h-4 w-4" /> Activity history</Button>
    {open && <div className="fixed inset-0 z-50 bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="ml-auto flex h-full w-full max-w-md flex-col border-l border-border bg-bg-elev shadow-2xl" role="dialog" aria-modal="true" aria-label="Inspection activity history">
        <header className="flex items-center justify-between border-b border-border p-4">
          <div><h2 className="text-lg font-semibold text-text">Inspection activity</h2><p className="text-xs text-text-muted">Who changed the report and when.</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close activity history" className="rounded-full p-2 text-text-muted hover:bg-surface-2 hover:text-text"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && <p className="rounded-card border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
          {!error && events.length === 0 && <p className="text-sm text-text-muted">No inspection changes recorded yet.</p>}
          <ol className="space-y-3">{events.map((event) => <li key={event.id} className="rounded-card border border-border bg-surface-2 p-3"><p className="text-sm text-text">{event.message}</p><time className="mt-1 block text-xs text-text-faint">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(event.createdAt))}</time></li>)}</ol>
        </div>
      </aside>
    </div>}
  </>;
}
