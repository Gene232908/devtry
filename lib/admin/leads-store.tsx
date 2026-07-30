"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Lead, LeadStatus, mockLeads } from "@/config/mock-data";

const STORAGE_KEY = "cvd_admin_leads_v1";

type LeadsContextValue = {
  leads: Lead[];
  /** Resolves false when the change could not be persisted (local state is rolled back). */
  updateLead: (id: string, patch: Partial<Lead>) => Promise<boolean>;
  getLead: (id: string) => Lead | undefined;
  /** True once real Supabase-backed leads loaded successfully; false = demo/mock data. */
  isLive: boolean;
  /** True until the first live/mock resolution completes — avoids flashing mock data before live data arrives. */
  isLoading: boolean;
  /** Re-fetches live leads from the server. No-op in demo/mock mode. */
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLiveRef = useRef(false);

  // Try real Supabase-backed leads first; fall back to the local mock/demo
  // dataset whenever the database isn't configured yet (or the request fails
  // for any reason) so the dashboard never breaks in demo mode.
  const loadLive = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/leads", { cache: "no-store" });
      if (!res.ok) return false;
      const body = await res.json();
      if (!body.ok || !Array.isArray(body.data?.leads)) return false;
      setLeads(body.data.leads);
      setIsLive(true);
      isLiveRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Signed-out screens (login, set password) mount the provider but have no
    // business asking the server for leads.
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    loadLive().then((live) => {
      if (cancelled) return;
      if (!live) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setLeads(JSON.parse(stored));
          } catch {
            setLeads(mockLeads);
          }
        } else {
          setLeads(mockLeads);
        }
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadLive, enabled]);

  // The admin layout mounts this provider once and keeps it alive across every
  // /admin/* page — without this, leads submitted after the dashboard was
  // first opened (e.g. from another tab, or the public site) would never show
  // up until a full page reload. Re-fetch whenever the tab regains focus.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && isLiveRef.current) {
        loadLive();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadLive]);

  useEffect(() => {
    if (isLive || isLoading) return; // real data persists in Supabase, not localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads, isLive, isLoading]);

  const value = useMemo<LeadsContextValue>(
    () => ({
      leads,
      isLive,
      isLoading,
      isRefreshing,
      refresh: async () => {
        if (!isLiveRef.current) return;
        setIsRefreshing(true);
        try {
          await loadLive();
        } finally {
          setIsRefreshing(false);
        }
      },
      // Resolves false when the write did not reach the database, so a caller
      // with a Save button can say so. It used to swallow every failure while
      // leaving the optimistic local update in place, which meant a rejected
      // status looked saved until the page was reloaded — the worst possible
      // outcome, because nothing on screen suggested anything was wrong.
      updateLead: async (id, patch) => {
        const previous = leads.find((l) => l.id === id);
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
        if (!isLive) return true;

        const body: Record<string, unknown> = {};
        if (patch.status !== undefined) body.status = patch.status;
        if (patch.estimatedValueAed !== undefined) body.estimated_value_aed = patch.estimatedValueAed;
        if (patch.notes !== undefined) body.notes = patch.notes;
        if (patch.isSpam !== undefined) body.is_spam = patch.isSpam;
        if (Object.keys(body).length === 0) return true;

        try {
          const res = await fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "update failed");
          return true;
        } catch {
          // Roll the optimistic update back so the UI never shows a value the
          // database rejected.
          if (previous) setLeads((prev) => prev.map((l) => (l.id === id ? previous : l)));
          return false;
        }
      },
      getLead: (id) => leads.find((l) => l.id === id),
    }),
    [leads, isLive, isLoading, isRefreshing, loadLive],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}

export type { Lead, LeadStatus };
