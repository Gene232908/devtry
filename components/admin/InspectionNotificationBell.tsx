"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, X } from "lucide-react";
import { formatScheduledInspection } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { StaffIdentity } from "@/lib/auth/permissions";

type Notification = {
  id: string;
  lead_id: string;
  lead_name: string;
  assigned_purchaser_name: string | null;
  previous_scheduled_at: string;
  scheduled_at: string;
  changed_by_name: string;
  created_at: string;
  read_at: string | null;
};

export function InspectionNotificationBell({ identity }: { identity: StaffIdentity | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const enabled = identity?.role === "admin" || identity?.role === "manager" || identity?.role === "purchaser";
  const load = useCallback(async () => {
    if (!enabled) return 0;
    try {
      const response = await fetch("/api/admin/inspection-notifications", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) return 0;
      setNotifications(body.data.notifications as Notification[]);
      const nextUnreadCount = body.data.unreadCount as number;
      setUnreadCount(nextUnreadCount);
      return nextUnreadCount;
    } catch {
      // Header navigation must remain usable when a notification read fails.
      return 0;
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;
    const currentUnreadCount = await load();
    if (currentUnreadCount > 0) {
      try {
        const response = await fetch("/api/admin/inspection-notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (response.ok) {
          setUnreadCount(0);
          setNotifications((current) => current.map((item) => item.read_at ? item : { ...item, read_at: new Date().toISOString() }));
        }
      } catch {
        // Keep the indicator until a successful read acknowledgement.
      }
    }
  }

  if (!enabled) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={unreadCount > 0 ? `${unreadCount} unread inspection notifications` : "Inspection notifications"}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-300 transition hover:border-gold/45 hover:bg-gold/10 hover:text-gold"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[0.62rem] font-bold leading-4 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-border bg-bg-elev shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text">Inspection updates</p>
              <p className="text-xs text-text-faint">Rescheduled appointments</p>
            </div>
            <Button variant="ghost" size="sm" aria-label="Close notifications" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-faint">No inspection reschedules yet.</p>
          ) : (
            <ul className="max-h-[min(60vh,32rem)] overflow-y-auto divide-y divide-border">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link href={`/admin/leads/${notification.lead_id}`} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-surface-2">
                    <div className="flex gap-2">
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      <div className="min-w-0 text-sm">
                        <p className="text-text"><span className="font-medium">{notification.lead_name}</span>&apos;s scheduled inspection has changed.</p>
                        <p className="mt-1 text-xs text-text-muted">Before: {formatScheduledInspection(notification.previous_scheduled_at)}</p>
                        <p className="text-xs text-gold">Now: {formatScheduledInspection(notification.scheduled_at)}</p>
                        <p className="mt-1 text-xs text-text-faint">Assigned Purchaser: {notification.assigned_purchaser_name ?? "Not assigned"} · Changed by {notification.changed_by_name}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
