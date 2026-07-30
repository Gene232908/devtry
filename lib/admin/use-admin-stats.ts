"use client";

import { useEffect, useState } from "react";
import { computeStats, mockLeads, visitorsSeries, submissionsSeries } from "@/config/mock-data";

export type AdminStats = {
  totalLeads: number;
  newToday: number;
  activeLeads: number;
  visitorsThisWeek: number;
  whatsappClicks: number;
  /** Valuation forms started but never submitted, and not since converted. */
  incompleteForms: number;
};

export type ChartPoint = { day: string; visitors?: number; submissions?: number };

type State = {
  stats: AdminStats;
  visitors: ChartPoint[];
  submissions: ChartPoint[];
  isLive: boolean;
  isLoading: boolean;
};

const MOCK_STATE: Omit<State, "isLoading"> = {
  stats: computeStats(mockLeads),
  visitors: visitorsSeries,
  submissions: submissionsSeries,
  isLive: false,
};

// Dashboard-only (not app-wide, unlike LeadsProvider) since stats/charts are
// only needed on the Overview page — keeps that cost off every other admin route.
export function useAdminStats() {
  const [state, setState] = useState<State>({ ...MOCK_STATE, isLoading: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, chartsRes] = await Promise.all([
          fetch("/api/admin/stats", { cache: "no-store" }),
          fetch("/api/admin/charts", { cache: "no-store" }),
        ]);
        if (!statsRes.ok || !chartsRes.ok) throw new Error("not configured");

        const statsBody = await statsRes.json();
        const chartsBody = await chartsRes.json();
        if (!statsBody.ok || !chartsBody.ok) throw new Error("query failed");

        if (!cancelled) {
          setState({
            stats: statsBody.data,
            visitors: chartsBody.data.visitors,
            submissions: chartsBody.data.submissions,
            isLive: true,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) setState({ ...MOCK_STATE, isLoading: false });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
