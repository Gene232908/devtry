"use client";

import { useEffect, useState } from "react";
import type { ExecutiveOverview, OverviewRange } from "@/lib/admin/executive-overview";

type State = { data: ExecutiveOverview | null; isLoading: boolean; error: string | null };
export type ExecutiveOverviewSeed = { data: ExecutiveOverview; range: OverviewRange };

// Client-side in-memory cache to make tab/filter switching instant (0ms latency)
const overviewCache = new Map<string, ExecutiveOverview>();
let lastKnownOverview: ExecutiveOverview | null = null;

function buildCacheKey(range: OverviewRange, comparisonRange?: OverviewRange): string {
  return `${range.from}_${range.to}__${comparisonRange ? `${comparisonRange.from}_${comparisonRange.to}` : "none"}`;
}

/** Loads the owner-only Overview data for the active and optional comparison range. */
export function useExecutiveOverview(range: OverviewRange, comparisonRange?: OverviewRange, seed?: ExecutiveOverviewSeed) {
  // Seed the in-memory cache with server-rendered data on first load if available
  if (seed && overviewCache.size === 0) {
    const seedKey = buildCacheKey(seed.range);
    overviewCache.set(seedKey, seed.data);
    overviewCache.set(`${seed.range.from}_${seed.range.to}__none`, seed.data);
    lastKnownOverview = seed.data;
  }

  const [state, setState] = useState<State>(() => {
    const key = buildCacheKey(range, comparisonRange);
    const cached = overviewCache.get(key);
    if (cached) return { data: cached, isLoading: false, error: null };
    if (seed && range.from === seed.range.from && range.to === seed.range.to && !comparisonRange) {
      return { data: seed.data, isLoading: false, error: null };
    }
    // SWR fallback: show last known dashboard instantly while revalidating
    if (lastKnownOverview) {
      return { data: lastKnownOverview, isLoading: true, error: null };
    }
    return { data: null, isLoading: true, error: null };
  });

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = buildCacheKey(range, comparisonRange);

    // Instant cache hit: if we have cached data and it's not an explicit manual refresh
    if (refreshIndex === 0 && overviewCache.has(cacheKey)) {
      const cached = overviewCache.get(cacheKey)!;
      setState({ data: cached, isLoading: false, error: null });
      return;
    }

    const isSeedRange = seed && refreshIndex === 0 && range.from === seed.range.from && range.to === seed.range.to;
    if (isSeedRange && !comparisonRange) {
      overviewCache.set(cacheKey, seed.data);
      setState({ data: seed.data, isLoading: false, error: null });
      return;
    }

    async function load() {
      // Don't show full loading skeleton if we already had data on screen, just flag loading
      setState((current) => ({ ...current, isLoading: true, error: null }));

      const url = new URL("/api/admin/overview", window.location.origin);
      url.searchParams.set("from", range.from);
      url.searchParams.set("to", range.to);
      if (comparisonRange) {
        url.searchParams.set("compareFrom", comparisonRange.from);
        url.searchParams.set("compareTo", comparisonRange.to);
      }

      try {
        const compKey = comparisonRange ? buildCacheKey(comparisonRange) : null;
        const cachedComp = compKey ? overviewCache.get(compKey) : null;

        const comparisonUrl = comparisonRange && !cachedComp
          ? new URL(`/api/admin/overview?from=${comparisonRange.from}&to=${comparisonRange.to}`, window.location.origin)
          : null;

        const [response, comparisonResponse] = await Promise.all([
          fetch(url, { cache: "no-store" }),
          comparisonUrl ? fetch(comparisonUrl, { cache: "no-store" }) : Promise.resolve(null),
        ]);

        // Safely parse JSON — if the server returned an HTML error page instead of JSON,
        // response.json() would throw a SyntaxError. We convert that into a clean error.
        let body: { ok?: boolean; error?: { message?: string }; data?: ExecutiveOverview } | null = null;
        let comparisonBody: { ok?: boolean; error?: { message?: string }; data?: ExecutiveOverview } | null = null;
        try {
          body = await response.json();
        } catch {
          throw new Error(response.status >= 500 ? "Server error loading overview. Please try again." : "Could not load Overview.");
        }
        if (comparisonResponse) {
          try {
            comparisonBody = await comparisonResponse.json();
          } catch {
            throw new Error("Could not load the comparison period.");
          }
        }

        if (!response.ok || !body?.ok) throw new Error(body?.error?.message ?? "Could not load Overview.");
        if (comparisonResponse && (!comparisonResponse.ok || !comparisonBody?.ok)) {
          throw new Error(comparisonBody?.error?.message ?? "Could not load the comparison period.");
        }

        const compData = comparisonBody?.data ?? cachedComp ?? null;
        const rawData = body!.data;
        if (!rawData) throw new Error("Could not load Overview.");
        const finalData: ExecutiveOverview = compData ? { ...rawData, comparisonOverview: compData } : rawData;

        // Store in cache
        lastKnownOverview = finalData;
        overviewCache.set(cacheKey, finalData);
        if (compData && comparisonRange) {
          overviewCache.set(buildCacheKey(comparisonRange), compData);
        }

        if (!cancelled) {
          setState({
            data: finalData,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            isLoading: false,
            error: error instanceof Error ? error.message : "Could not load Overview.",
          }));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [range, comparisonRange, refreshIndex, seed]);

  return {
    ...state,
    refresh: () => {
      overviewCache.clear();
      setRefreshIndex((index) => index + 1);
    },
  };
}

