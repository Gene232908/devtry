"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Eye, FileText, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import {
  formatEventTimestamp,
  formatViewSummary,
  type LeadEvent,
  type LeadViewSummary,
} from "@/lib/admin/lead-events";

type Props = {
  events: LeadEvent[];
  views: LeadViewSummary;
};

export function LeadActivityCard({ events, views }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Extract all saved note revisions
  const notes = events.filter(
    (ev) =>
      ev.type === "note_updated" &&
      ((ev.note && ev.note.trim().length > 0) || ev.message.includes(":")),
  );

  const recentEvents = events.slice(0, 5);
  const hasOlderEvents = events.length > recentEvents.length;

  const openNote = (id: string) => {
    setSelectedNoteId(id);
    setNotesOpen(true);
  };

  const formatActivityMessage = (ev: LeadEvent): string => {
    if (ev.type === "note_updated") {
      const actor = ev.actorLabel ?? "Staff member";
      const isCleared =
        ev.message.toLowerCase().includes("cleared") ||
        (!ev.note && !ev.message.includes(":"));
      if (isCleared) {
        return `Note cleared by ${actor}`;
      }
      return `Note recorded by ${actor}`;
    }
    return ev.message;
  };

  return (
    <>
      <Card className="flex flex-col gap-4 p-5 min-w-0">
        {/* Card Header: Title + Views Summary + Notes History Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text">Activity</h3>
            <span className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
              <Eye className="h-3.5 w-3.5 text-text-faint shrink-0" />
              <span className="truncate">{formatViewSummary(views)}</span>
            </span>
          </div>

          {notes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5 border-gold/50 text-gold hover:bg-gold/10 hover:border-gold text-xs h-8 px-3 font-medium transition-colors shrink-0"
              onClick={() => {
                setSelectedNoteId(null);
                setNotesOpen(true);
              }}
            >
              <History className="h-3.5 w-3.5" />
              Notes History ({notes.length})
            </Button>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <ul className="flex flex-col gap-3 min-w-0">
          {recentEvents.map((ev) => {
            const isNote = ev.type === "note_updated";
            const hasNoteContent =
              isNote &&
              ((ev.note && ev.note.trim().length > 0) || ev.message.includes(":"));

            return (
              <li key={ev.id} className="flex gap-3 text-sm min-w-0">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <p className="text-text leading-snug font-normal break-words min-w-0">
                      {formatActivityMessage(ev)}
                    </p>
                    {hasNoteContent && (
                      <button
                        type="button"
                        onClick={() => openNote(ev.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-light hover:underline transition-colors shrink-0"
                      >
                        <FileText className="h-3 w-3" />
                        View note
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatEventTimestamp(ev.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {hasOlderEvents && (
          <Button
            variant="outline"
            size="sm"
            className="self-start mt-1 text-xs"
            onClick={() => setHistoryOpen(true)}
          >
            See full activity ({events.length})
          </Button>
        )}
      </Card>

      {/* Notes History Dialog (Simple, High-Visibility, Audit-Ready) */}
      <Dialog
        open={notesOpen}
        onClose={() => {
          setNotesOpen(false);
          setSelectedNoteId(null);
        }}
        title={`Notes History (${notes.length} saved)`}
        className="max-w-2xl w-full"
      >
        <div className="flex flex-col gap-3 -mt-2">
          <p className="text-xs text-text-muted">
            Complete audit trail of all saved notes. Compare previous revisions to verify changes.
          </p>

          <div className="max-h-[65vh] space-y-3.5 overflow-y-auto pr-1 sm:max-h-[32rem]">
            {notes.map((item, idx) => {
              const isLatest = idx === 0;
              const isSelected = selectedNoteId === item.id;
              const rawNote =
                item.note ??
                item.message.replace(/^Note saved[^:]*:\s*/, "").trim();

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all min-w-0 max-w-full overflow-hidden",
                    isSelected
                      ? "border-gold ring-2 ring-gold/40 bg-gold/[0.05]"
                      : isLatest
                      ? "border-gold/60 bg-surface-2 shadow-sm"
                      : "border-border/60 bg-surface-2/60 hover:border-border",
                  )}
                >
                  {/* Clear Audit Header: Revision Label + Author + Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5 mb-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      {isLatest ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-400 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          Latest Note
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-xs font-medium text-text-muted shrink-0">
                          <History className="h-3 w-3" />
                          Revision #{notes.length - idx}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs text-text-muted">by</span>
                        <span className="text-sm font-semibold text-text">
                          {item.actorLabel ?? "Staff member"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
                      <Clock className="h-3.5 w-3.5 text-text-faint shrink-0" />
                      <span>{formatEventTimestamp(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Note Body: High-Contrast, Wrapped, Never Overflowing */}
                  <div className="rounded-lg bg-surface-1/90 border border-border/40 p-3.5 min-w-0 max-w-full overflow-hidden">
                    <p className="text-sm text-text leading-relaxed whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] select-text font-normal">
                      {rawNote}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>

      {/* Full Activity History Dialog */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Full Activity History (${events.length})`}
        className="max-w-2xl w-full"
      >
        <div className="flex flex-col gap-3 -mt-2">
          <p className="text-xs text-text-muted">
            Newest activity is at the top. This includes notes, status changes, and staff views.
          </p>

          <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1.5 sm:max-h-[30rem]">
            {events.map((ev) => {
              const isNote = ev.type === "note_updated";
              const hasNoteContent =
                isNote &&
                ((ev.note && ev.note.trim().length > 0) || ev.message.includes(":"));

              return (
                <li
                  key={ev.id}
                  className="flex gap-3 text-sm border-b border-border/40 pb-2.5 last:border-0 min-w-0"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <p className="text-text leading-snug font-normal break-words min-w-0">
                        {formatActivityMessage(ev)}
                      </p>
                      {hasNoteContent && (
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryOpen(false);
                            openNote(ev.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-light hover:underline transition-colors shrink-0"
                        >
                          <FileText className="h-3 w-3" />
                          View note
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatEventTimestamp(ev.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Dialog>
    </>
  );
}
