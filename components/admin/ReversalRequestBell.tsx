"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, type StaffIdentity } from "@/lib/auth/permissions";
import { formatStaffErrorDate, type StaffErrorRecord } from "@/lib/admin/staff-errors";

// Fired by the staff report after Approve / Decline so the badge updates at once
// instead of waiting for the next poll.
export const REVERSAL_REQUESTS_CHANGED_EVENT = "cvd:reversal-requests-changed";

const POLL_MS = 30_000;
const REVIEW_HREF = "/admin/staff?tab=report";

/**
 * Super Admin alert for arrival reversal requests waiting for approval.
 *
 * Reads the same owner-only endpoint the Staff Error & Reversal Report uses, so
 * the count here always matches the "Pending Review" rows there. Polls every
 * 30 seconds while the tab is visible and refreshes on focus; when the number
 * of pending requests goes up, a toast names who asked so it is seen at once.
 */
export function ReversalRequestBell({ identity }: { identity: StaffIdentity | null | undefined }) {
  const enabled = identity?.role === "admin" || identity?.role === "manager";
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<StaffErrorRecord[]>([]);
  const [toast, setToast] = useState<StaffErrorRecord | null>(null);
  const knownIds = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/admin/staff-errors", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok || !Array.isArray(body.data?.records)) return;
      const next = (body.data.records as StaffErrorRecord[])
        .filter((r) => r.status === "pending_approval")
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      // Only announce requests that appeared after the first load, so opening
      // the dashboard does not pop a toast for requests already waiting.
      if (knownIds.current) {
        const fresh = next.find((r) => !knownIds.current!.has(r.id));
        if (fresh) setToast(fresh);
      }
      knownIds.current = new Set(next.map((r) => r.id));
      setPending(next);
    } catch {
      // Header navigation must remain usable when the alert read fails.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener(REVERSAL_REQUESTS_CHANGED_EVENT, onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(REVERSAL_REQUESTS_CHANGED_EVENT, onFocus);
    };
  }, [enabled, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!enabled) return null;

  const count = pending.length;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) void load();
          }}
          aria-label={count > 0 ? `${count} arrival reversal requests waiting for approval` : "Arrival reversal requests"}
          title={count > 0 ? `${count} reversal request${count === 1 ? "" : "s"} waiting for your approval` : "No reversal requests waiting"}
          className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
            count > 0
              ? "border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-gold/45 hover:bg-gold/10 hover:text-gold"
          }`}
        >
          <BellRing className={`h-4 w-4 ${count > 0 ? "animate-pulse" : ""}`} />
          {count > 0 && (
            <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[0.62rem] font-bold leading-4 text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-border bg-bg-elev shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text">Reversal requests</p>
                <p className="text-xs text-text-faint">Arrival turn-offs waiting for your approval</p>
              </div>
              <Button variant="ghost" size="sm" aria-label="Close reversal requests" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {count === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-faint">No reversal requests waiting.</p>
            ) : (
              <ul className="max-h-[min(60vh,32rem)] overflow-y-auto divide-y divide-border">
                {pending.slice(0, 10).map((req) => (
                  <li key={req.id}>
                    <Link href={REVIEW_HREF} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-surface-2">
                      <div className="flex gap-2">
                        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <div className="min-w-0 text-sm">
                          <p className="text-text">
                            <span className="font-medium">{req.agentName}</span>
                            <span className="text-text-muted"> ({ROLE_LABELS[req.agentRole] ?? req.agentRole})</span> wants to turn off arrival for{" "}
                            <span className="font-medium">{req.customerName}</span>
                          </p>
                          <p className="mt-0.5 truncate text-xs text-text-muted">{req.vehicleDetails}</p>
                          <p className="mt-1 line-clamp-2 text-xs italic text-text">&ldquo;{req.reason}&rdquo;</p>
                          <p className="mt-1 text-[11px] font-mono text-text-faint">{formatStaffErrorDate(req.timestamp)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-border px-4 py-2.5">
              <Link
                href={REVIEW_HREF}
                onClick={() => setOpen(false)}
                className="block w-full rounded-md bg-gold px-3 py-2 text-center text-xs font-semibold text-bg hover:opacity-90"
              >
                Open Reversal Requests
              </Link>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-20 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-card border border-amber-400/40 bg-bg-elev p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-text">New reversal request</p>
              <p className="mt-0.5 text-text-muted">
                {toast.agentName} wants to turn off arrival for <span className="text-text">{toast.customerName}</span>.
              </p>
              <Link
                href={REVIEW_HREF}
                onClick={() => setToast(null)}
                className="mt-2 inline-flex rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90"
              >
                Review now
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToast(null)}
              className="text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
