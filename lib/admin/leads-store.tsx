"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Lead, LeadStatus, mockLeads } from "@/config/mock-data";

const STORAGE_KEY = "cvd_admin_leads_v1";

type LeadsContextValue = {
  leads: Lead[];
  updateLead: (id: string, patch: Partial<Lead>) => void;
  getLead: (id: string) => Lead | undefined;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setLeads(JSON.parse(stored));
      } catch {
        // ignore malformed cache, keep seed data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const value = useMemo<LeadsContextValue>(
    () => ({
      leads,
      updateLead: (id, patch) => setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
      getLead: (id) => leads.find((l) => l.id === id),
    }),
    [leads],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}

export type { Lead, LeadStatus };
