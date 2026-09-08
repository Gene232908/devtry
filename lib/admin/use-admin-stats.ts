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

export type AdminStatsFilter = {
  from?: string;
  to?: string;
};

/**
 * Dashboard-only (not app-wide, unlike LeadsProvider) since stats/charts are
 * only needed on the Overview page — keeps that cost off every other admin route.
 *
 * `seed` is the server-rendered result handed down by `admin/page.tsx`. When it
 * is present and no filter is active, the hook starts already resolved and never fetches:
 * the counts and both chart series were produced during the server render.
 *
 * When a `filter` is provided ({ from, to }), it fetches from /api/admin/stats and
 * /api/admin/charts with query parameters so the admin can backtrack into any
 * year, month, or day range.
 */
export function useAdminStats(seed?: AdminStatsSeed, filter?: AdminStatsFilter) {
  const [state, setState] = useState<State>(
    seed && !filter?.from
      ? { ...seed, isLoading: false }
      : { ...MOCK_STATE, isLoading: true },
  );

  const [refreshIndex, setRefreshIndex] = useState(0);
  const refetch = () => setRefreshIndex((i) => i + 1);

  const filterFrom = filter?.from;
  const filterTo = filter?.to;
  const isFiltered = Boolean(filterFrom && filterTo);

  useEffect(() => {
    let cancelled = false;

    // Adopt figures from a fresh server render only when NO custom filter is active.
    if (seed && !isFiltered && refreshIndex === 0) {
      setState({ ...seed, isLoading: false });
      return;
    }

    // Milestone 2: preview mode fallback
    if (ADMIN_PREVIEW && !isFiltered) {
      setState({ ...MOCK_STATE, isLoading: false });
      return;
    }

    async function load() {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const statsUrl = new URL("/api/admin/stats", window.location.origin);
        const chartsUrl = new URL("/api/admin/charts", window.location.origin);

        if (filterFrom && filterTo) {
          statsUrl.searchParams.set("from", filterFrom);
          statsUrl.searchParams.set("to", filterTo);
          chartsUrl.searchParams.set("from", filterFrom);
          chartsUrl.searchParams.set("to", filterTo);
        }

        const [statsRes, chartsRes] = await Promise.all([
          fetch(statsUrl.toString(), { cache: "no-store" }),
          fetch(chartsUrl.toString(), { cache: "no-store" }),
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
        if (!cancelled) {
          setState({ ...MOCK_STATE, isLoading: false });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [seed, filterFrom, filterTo, isFiltered, refreshIndex]);

  return { ...state, refetch };
}

