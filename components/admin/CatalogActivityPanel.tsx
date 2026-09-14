"use client";

import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type CatalogActivity = {
  id: string;
  entity_type: "make" | "model" | "trim";
  entity_id: string;
  entity_name: string;
  parent_name: string | null;
  action: "created" | "archived" | "restored";
  actor_name: string;
  created_at: string;
};

export function CatalogActivityPanel({
  events,
  loading = false,
  restoringId,
  onRestore,
}: {
  events: CatalogActivity[];
  loading?: boolean;
  restoringId: string | null;
  onRestore: (event: CatalogActivity) => void;
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-gold" />
        <h2 className="text-fluid-0 text-text">Recent catalog activity</h2>
      </div>
      {loading ? (
        <p className="mt-3 text-fluid--1 text-text-faint">Loading activity history…</p>
      ) : events.length === 0 ? (
        <p className="mt-3 text-fluid--1 text-text-faint">
          No recent catalog changes.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 py-2.5 text-fluid--1"
            >
              <p className="min-w-0 flex-1 text-text-muted">
                <span className="capitalize text-text">{event.action}</span>{" "}
                {event.entity_type}{" "}
                <span className="text-text">{event.entity_name}</span>
                {event.parent_name ? ` · ${event.parent_name}` : ""}
                <span className="block text-text-faint">
                  {event.actor_name} ·{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Dubai",
                  }).format(new Date(event.created_at))}
                </span>
              </p>
              {event.action === "archived" && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={restoringId === event.entity_id}
                  onClick={() => onRestore(event)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore to catalog
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
