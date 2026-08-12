"use client";

import { useEffect, useState } from "react";
import { computeStats, mockLeads, visitorsSeries, submissionsSeries } from "@/config/mock-data";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
// Type-only import. `import type` is erased at compile time, so this does NOT
// pull the server-only query module (and its service-role client) into the
// browser bundle. Kept pointing at queries.ts so the shape has one definition,
// declared where it is actually produced.
import type { AdminStats, ChartPoint } from "@/lib/admin/queries";

export type { AdminStats, ChartPoint };

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

export type AdminStatsSeed = {
  stats: AdminStats;
  visitors: ChartPoint[];
  submissions: ChartPoint[];
  isLive: boolean;
};

/**
 * Dashboard-only (not app-wide, unlike LeadsProvider) since stats/charts are
 * only needed on the Overview page — keeps that cost off every other admin route.
 *
 * `seed` is the server-rendered result handed down by `admin/page.tsx`. When it
 * is present the hook starts already resolved and never fetches: the counts and
 * both chart series were produced during the server render, so re-requesting
 * them over HTTP on mount would only repeat work that is already on screen.
 *
 * Without a seed it behaves exactly as before, fetching on mount — which is
 * what preview mode and any other caller still rely on.
 */
export function useAdminStats(seed?: AdminStatsSeed) {
  const [state, setState] = useState<State>(
    seed ? { ...seed, isLoading: false } : { ...MOCK_STATE, isLoading: true },
  );

  useEffect(() => {
    let cancelled = false;

    // Adopt figures from a fresh server render.
    //
    // This used to `return` here on the grounds that a seed was "already
    // resolved", which was wrong in a way that made the Overview quietly lie:
    // useState's initialiser runs only on the FIRST render, so once mounted the
    // hook kept its original numbers forever. A new seed — from router.refresh(),
    // from the Refresh button, from any re-render of the server component — was
    // received as a prop and then thrown away. The dashboard showed a snapshot
    // of the moment it was opened and nothing on screen said so.
    //
    // `seed` is a new object on every server render, so this re-runs exactly
    // when there are new figures to take, and never loops: setState does not
    // change the identity of `seed`.
    if (seed) {
      setState({ ...seed, isLoading: false });
      return;
    }

    // Milestone 2: the dashboard is a design preview, so the summary cards and
    // charts are rendered from the demo dataset rather than live counts.
    if (ADMIN_PREVIEW) {
      setState({ ...MOCK_STATE, isLoading: false });
      return;
    }

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
  }, [seed]);

  return state;
}
