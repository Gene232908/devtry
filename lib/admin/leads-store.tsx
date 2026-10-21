"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Lead, LeadStatus, mockLeads } from "@/config/mock-data";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { useRefreshOnFocus } from "@/lib/admin/use-fresh-server-data";
import { demoNewLeads } from "@/config/demo-admin-data";

import { useStaffIdentity } from "@/lib/admin/staff-identity-context";
import { assignLeadsRoundRobin, assignPurchaserOnInspectionScheduled } from "@/lib/admin/round-robin";
import { visibleLeadsFor } from "@/lib/auth/lead-visibility";

/**
 * Fictional staff, used ONLY to give the offline mock/demo dataset plausible
 * assignments so the walkthrough has something to show.
 *
 * These ids must never touch live data. They used to: the round-robin ran over
 * this list on every load, including live loads, and overwrote the real
 * `callCenterId`/`purchaserId` that came back from the database with "agent-1"
 * and "purchaser-1". Nothing was ever written back, so who owned a lead was
 * whatever the browser last decided — and the visibility filter below then had
 * to guess its way back to the truth by matching display names.
 *
 * Assignment is a server decision now (lib/server/lead-assignment.ts). Live
 * leads arrive already owned.
 */
const DEMO_STAFF_ACCOUNTS = [
  { id: "agent-1", role: "call_center" as const, createdAt: "2026-01-01T00:00:00Z" },
  { id: "agent-2", role: "call_center" as const, createdAt: "2026-01-02T00:00:00Z" },
  { id: "purchaser-1", role: "purchaser" as const, createdAt: "2026-01-01T00:00:00Z" },
  { id: "purchaser-2", role: "purchaser" as const, createdAt: "2026-01-02T00:00:00Z" },
];

const STORAGE_KEY = "cvd_admin_leads_v1";

/**
 * Everything editable on a lead, plus the two purchase figures.
 *
 * Those two are not fields on `Lead` on purpose: the money lives on the
 * `inventory` record, not the lead (see migration 0014). They travel with this
 * patch because recording a deal is a single action for the owner — one Save on
 * the lead screen — even though the server splits it across two tables.
 */
export type LeadPatch = Partial<Lead> & {
  purchasePriceAed?: number;
  /** ISO date. Defaults to now on the server when omitted. */
  purchasedAt?: string;
  reason?: string;
  originalArrivedBy?: string;
  requestArrivalReversal?: boolean;
};

type LeadsContextValue = {
  leads: Lead[];
  /** Resolves false when the change could not be persisted (local state is rolled back). */
  updateLead: (id: string, patch: LeadPatch) => Promise<boolean>;
  getLead: (id: string) => Lead | undefined;
  /** True once real Supabase-backed leads loaded successfully; false = demo/mock data. */
  isLive: boolean;
  /** True until the first live/mock resolution completes — avoids flashing mock data before live data arrives. */
  isLoading: boolean;
  /** Re-fetches leads from the server. No-op only in explicit preview mode or when disabled. */
  refresh: () => Promise<void>;
  isRefreshing: boolean;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

/**
 * `enabled` lets the layout mount this provider on every admin route — which it
 * must, since a route transition can render a page before the layout's pathname
 * updates, and a context that is missing for even one frame crashes the page —
 * while still not fetching leads on the signed-out screens.
 */
export function LeadsProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLiveRef = useRef(false);

  const identity = useStaffIdentity();

  // Try real Supabase-backed leads first; fall back to the local mock/demo
  // dataset whenever the database isn't configured yet (or the request fails
  // for any reason) so the dashboard never breaks in demo mode.
  const loadLive = useCallback(async () => {
    if (ADMIN_PREVIEW) return false;

    try {
      const res = await fetch("/api/admin/leads", { cache: "no-store" });
      if (!res.ok) return false;
      const body = await res.json();
      if (!body.ok || !Array.isArray(body.data?.leads)) return false;
      // No client-side assignment here on purpose — the rows already carry the
      // assignment the server made, and the server has additionally scoped
      // WHICH rows were sent.
      setAllLeads(body.data.leads as Lead[]);
      setIsLive(true);
      isLiveRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (ADMIN_PREVIEW) {
      const rawLeads = [...demoNewLeads, ...mockLeads];
      const assigned = assignLeadsRoundRobin<Lead>(rawLeads, DEMO_STAFF_ACCOUNTS);
      setAllLeads(assigned);
      setIsLoading(false);
      return;
    }

    loadLive().then((live) => {
      if (cancelled) return;
      if (!live) {
        const stored = localStorage.getItem(STORAGE_KEY);
        let rawLeads = mockLeads;
        if (stored) {
          try {
            rawLeads = JSON.parse(stored);
          } catch {
            rawLeads = mockLeads;
          }
        }
        setAllLeads(assignLeadsRoundRobin<Lead>(rawLeads, DEMO_STAFF_ACCOUNTS));
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadLive, enabled]);

  // A second, narrower pass over what the server already scoped.
  //
  // It is NOT the security boundary — GET /api/admin/leads decides what leaves
  // the database, and this cannot un-send a row. It exists because the demo
  // dataset never goes through that endpoint, and because it keeps the rule
  // readable in one place next to the screens that depend on it.
  //
  // Matching is on assignment id only. It used to fall back to substring
  // matching on the signed-in person's display name ("mat", "waaa") to paper
  // over the demo ids being written into live leads above — which meant renaming
  // a staff account silently changed which customers they could see.
  const visibleLeads = useMemo(
    () => (identity ? visibleLeadsFor(allLeads, identity.role, identity.userId) : allLeads),
    [allLeads, identity],
  );

  // The admin layout mounts this provider once and keeps it alive across every
  // /admin/* page — without this, leads submitted after the dashboard was first
  // opened (e.g. from another tab, or the public site) would never show up
  // until a full page reload.
  //
  // Focus alone was not enough. It covered coming BACK to the tab but not
  // sitting on it: a lead arriving while the Leads Directory was open and
  // watched stayed invisible for as long as nobody clicked away and back. This
  // is the same hook the server-rendered admin screens use, so every screen in
  // the dashboard now refreshes on the same terms — mount, focus, visibility,
  // and a 20-second poll that stops entirely while the tab is hidden.
  //
  // Refreshing replaces `leads` in place, so an active search, filter, sort or
  // page in the table below is untouched by it.
  const refreshIfLive = useCallback(() => {
    // Demo/mock mode has no server to re-read, and the signed-out screens must
    // not be asking for leads at all.
    if (!enabled || !isLiveRef.current) return;
    void loadLive();
  }, [enabled, loadLive]);

  // Only where the leads are actually on screen: the Overview's Recent Leads,
  // and the Leads Directory itself.
  //
  // Because this provider lives in the layout, polling it unconditionally meant
  // every admin page quietly re-fetched the whole leads table every 20 seconds
  // — a ~158ms request running behind Catalog, Settings, Commission and every
  // other screen that never shows a lead, competing with the page the person
  // was actually trying to open.
  //
  // Detail pages are excluded on purpose: they read one lead through
  // `getLead`/`updateLead` and a background replacement of the list underneath
  // an open edit form would be a race, not a feature.
  const pathname = usePathname();
  const showsLeadList = pathname === "/admin" || pathname === "/admin/leads";

  useRefreshOnFocus(refreshIfLive, showsLeadList);

  useEffect(() => {
    if (ADMIN_PREVIEW) return;
    if (isLive || isLoading) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLeads));
  }, [allLeads, isLive, isLoading]);

  const value = useMemo<LeadsContextValue>(
    () => ({
      leads: visibleLeads,
      isLive,
      isLoading,
      isRefreshing,
      refresh: async () => {
        // A manual refresh must also be able to recover after the provider's
        // first request fell back to stored/demo data. This is especially
        // important immediately after an incomplete form is converted: the
        // database insert may be successful even when the provider has not
        // established its live state yet.
        if (ADMIN_PREVIEW || !enabled) return;
        setIsRefreshing(true);
        try {
          await loadLive();
        } finally {
          setIsRefreshing(false);
        }
      },
      updateLead: async (id, patch) => {
        const previous = allLeads.find((l) => l.id === id);

        // Offline demo/mock only. Nothing writes back there, so the hand-over
        // has to be simulated locally for the walkthrough to make sense. Live
        // leads get their purchaser from the server, which is the only place
        // that can pick one who actually exists and is active.
        const localPatch: LeadPatch = { ...patch };
        if (!isLive && patch.status === "inspection_scheduled" && previous && !previous.purchaserId) {
          const assigned = assignPurchaserOnInspectionScheduled(previous, DEMO_STAFF_ACCOUNTS, allLeads);
          if (assigned.purchaserId) localPatch.purchaserId = assigned.purchaserId;
        }

        setAllLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...localPatch } : l)));
        if (ADMIN_PREVIEW || !isLive) return true;

        const body: Record<string, unknown> = {};
        if (patch.status !== undefined) body.status = patch.status;
        // purchaser_id is deliberately absent. Which purchaser receives a
        // scheduled lead is a server decision — the round-robin needs the real
        // staff table and the real rotation position, neither of which the
        // browser has. Sending one from here was how a client could hand itself
        // somebody else's lead; the endpoint now ignores it from any role
        // without the assignLeads capability.
        if (patch.inspectionScheduledAt !== undefined) body.inspection_scheduled_at = patch.inspectionScheduledAt;
        if (patch.arrivalStatus !== undefined) body.arrival_status = patch.arrivalStatus;
        if (patch.reason !== undefined) body.reason = patch.reason;
        if (patch.originalArrivedBy !== undefined) body.original_arrived_by = patch.originalArrivedBy;
        if (patch.requestArrivalReversal !== undefined) body.request_arrival_reversal = patch.requestArrivalReversal;
        if (patch.estimatedValueAed !== undefined) body.estimated_value_aed = patch.estimatedValueAed;
        if (patch.notes !== undefined) body.notes = patch.notes;
        if (patch.isSpam !== undefined) body.is_spam = patch.isSpam;
        if (patch.purchasePriceAed !== undefined) body.purchase_price_aed = patch.purchasePriceAed;
        if (patch.purchasedAt !== undefined) body.purchased_at = patch.purchasedAt;
        if (Object.keys(body).length === 0) return true;

        try {
          const res = await fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "update failed");

          // Scheduling the inspection hands the lead to a purchaser server-side.
          // Re-read so the list reflects who actually received it, rather than a
          // local copy that still shows it unassigned.
          if (patch.status === "inspection_scheduled") void loadLive();

          return true;
        } catch {
          if (previous) setAllLeads((prev) => prev.map((l) => (l.id === id ? previous : l)));
          return false;
        }
      },
      getLead: (id) => visibleLeads.find((l) => l.id === id) ?? allLeads.find((l) => l.id === id),
    }),
    [visibleLeads, allLeads, isLive, isLoading, isRefreshing, loadLive, enabled],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}

export type { Lead, LeadStatus };
