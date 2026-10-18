"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lead, LeadStatus } from "@/config/mock-data";
import type { StaffRole } from "@/lib/auth/permissions";
import { AGENT_STATUS_CHOICES, PURCHASER_VISIBLE_STATUSES } from "@/lib/auth/lead-visibility";
import { FILTER_STATUS_OPTIONS } from "@/lib/format";
import { uaeDayKey } from "@/lib/uae-time";

export type SortKey = "date" | "value";

type LeadCreatedRange = { from: string; to: string };

function parseLeadCreatedRange(from: string | null | undefined, to: string | null | undefined): LeadCreatedRange | null {
  if (typeof from !== "string" || typeof to !== "string") return null;
  const validDateKey = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (!validDateKey(from) || !validDateKey(to) || from > to) return null;
  return { from, to };
}

/**
 * An agent's filter includes one status beyond what `AGENT_STATUS_CHOICES`
 * offers: "Deal" is never a status an agent can SET (only a purchaser records
 * one — see `canRoleSetStatus`), but the lead is still theirs, since
 * `canSeeLead` never drops it from their list just because it moved on. "Which
 * of my customers actually bought" is a real, common question — this is the
 * one place that list needs to be a status wider than what they can write.
 */
const AGENT_FILTER_STATUSES: readonly LeadStatus[] = [...AGENT_STATUS_CHOICES, "deal"];

/**
 * Which statuses this role's status filter offers, in pipeline order.
 *
 * Mostly the same statuses `lead-visibility.ts` defines for what a role may
 * set and see — an agent's filter listing "Not Purchased" or "Negotiating"
 * would offer boxes that could never match one of their leads. An owner still
 * gets every status: their job is the whole pipeline, not one role's slice.
 */
export function filterStatusOptionsForRole(role: StaffRole | undefined): readonly LeadStatus[] {
  if (role === "call_center") return AGENT_FILTER_STATUSES;
  if (role === "purchaser") return PURCHASER_VISIBLE_STATUSES;
  return FILTER_STATUS_OPTIONS;
}

/**
 * The status filter an operational role lands on. Purchasers start with their
 * freshly scheduled queue. Customer Service starts with its complete assigned
 * directory because recovered incomplete forms are converted directly to
 * Inspection Scheduled; defaulting that role to New would make a successful
 * conversion appear to disappear.
 *
 * Purchaser keeps a single preset status rather than "everything except done";
 * its status control remains available for widening the historical view.
 */
export function defaultStatusesForRole(role: StaffRole | undefined): LeadStatus[] {
  if (role === "purchaser") return ["inspection_scheduled"];
  return [];
}

/**
 * Where a lead sits in this role's work queue: lowest number floats to the
 * top, regardless of whatever column sort is picked — a queue whose most
 * urgent item could be scrolled away by clicking "Sort by value" would defeat
 * the point of having a queue.
 *
 * Each operational role gets its own "just arrived, needs a first touch"
 * status and its own "handed off, nothing left for me to do" tier:
 *   call_center — New is unworked and most urgent; Pending/Contacted is still
 *                 theirs to work; anything from Inspection Scheduled onward
 *                 (including Deal) has moved past them to a purchaser.
 *   purchaser   — Inspection Scheduled is the freshest hand-off it can act on;
 *                 Deal means the sale is done.
 * Owner roles (and the moment before identity has loaded) keep the original,
 * simpler rule — only New is special, nothing sinks to its own tier — because
 * an owner's job is to see the whole pipeline, not work through it in order.
 */
export function queuePriority(status: LeadStatus, role: StaffRole | undefined): number {
  if (role === "call_center") {
    if (status === "new") return 0;
    if (status === "pending" || status === "contacted") return 1;
    return 2; // inspection_scheduled, deal, and anything further along
  }
  if (role === "purchaser") {
    if (status === "inspection_scheduled") return 0;
    if (status === "deal") return 2;
    return 1; // inspected, negotiating
  }
  return status === "new" ? 0 : 1;
}

type SavedFilterState = {
  search?: string;
  statuses?: LeadStatus[];
  makes?: string[];
  emirates?: string[];
  arrivalStatuses?: string[];
  page?: number;
};

function getSavedFilter(key: string): SavedFilterState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SavedFilterState;
  } catch {
    return null;
  }
}

export function useLeadsFilter(
  leads: Lead[],
  role?: StaffRole,
  attentionFilter?: string | null,
  statusFilter?: string | null,
  createdFrom?: string | null,
  createdTo?: string | null,
  sessionScope?: string,
) {
  const storageKey = `cvd_leads_filter_${sessionScope ?? "regular"}_${role ?? "all"}`;

  const requestedStatus = statusFilter && FILTER_STATUS_OPTIONS.some((status) => status === statusFilter)
    ? (statusFilter as LeadStatus)
    : null;
  const createdRange = useMemo(
    () => parseLeadCreatedRange(createdFrom, createdTo),
    [createdFrom, createdTo],
  );

  const hasUrlFilter = Boolean(attentionFilter || statusFilter || createdFrom || createdTo);

  // searchInput updates the text box instantly; search (debounced) drives
  // filtering, so typing doesn't re-filter/re-sort/re-render on every keystroke.
  const [searchInput, setSearchInput] = useState(() => {
    if (hasUrlFilter) return "";
    const saved = getSavedFilter(storageKey);
    return saved?.search ?? "";
  });
  const [search, setSearch] = useState(() => {
    if (hasUrlFilter) return "";
    const saved = getSavedFilter(storageKey);
    return saved?.search ?? "";
  });

  const [statuses, setStatuses] = useState<LeadStatus[]>(() => {
    if (attentionFilter) return [];
    if (requestedStatus) return [requestedStatus];
    const saved = getSavedFilter(storageKey);
    if (saved && Array.isArray(saved.statuses)) return saved.statuses;
    return defaultStatusesForRole(role);
  });
  const [makes, setMakes] = useState<string[]>(() => {
    if (hasUrlFilter) return [];
    const saved = getSavedFilter(storageKey);
    return saved && Array.isArray(saved.makes) ? saved.makes : [];
  });
  const [emirates, setEmirates] = useState<string[]>(() => {
    if (hasUrlFilter) return [];
    const saved = getSavedFilter(storageKey);
    return saved && Array.isArray(saved.emirates) ? saved.emirates : [];
  });
  const [arrivalStatuses, setArrivalStatuses] = useState<string[]>(() => {
    if (hasUrlFilter) return [];
    const saved = getSavedFilter(storageKey);
    return saved && Array.isArray(saved.arrivalStatuses) ? saved.arrivalStatuses : [];
  });
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(() => {
    if (hasUrlFilter) return 1;
    const saved = getSavedFilter(storageKey);
    return typeof saved?.page === "number" && saved.page > 0 ? saved.page : 1;
  });
  const [pageSize, setPageSizeState] = useState(6);

  const currentKeyRef = useRef(storageKey);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  // If storageKey changes (e.g. switching between regular and scrap scope),
  // immediately reload that scope's saved filters rather than writing the
  // previous scope's in-memory filters into the new scope's key.
  useEffect(() => {
    if (currentKeyRef.current !== storageKey) {
      currentKeyRef.current = storageKey;
      if (!hasUrlFilter) {
        const saved = getSavedFilter(storageKey);
        setSearchInput(saved?.search ?? "");
        setSearch(saved?.search ?? "");
        setStatuses(
          saved && Array.isArray(saved.statuses)
            ? saved.statuses
            : defaultStatusesForRole(role),
        );
        setMakes(saved && Array.isArray(saved.makes) ? saved.makes : []);
        setEmirates(saved && Array.isArray(saved.emirates) ? saved.emirates : []);
        setArrivalStatuses(
          saved && Array.isArray(saved.arrivalStatuses) ? saved.arrivalStatuses : [],
        );
        setPage(
          typeof saved?.page === "number" && saved.page > 0 ? saved.page : 1,
        );
      }
    }
  }, [storageKey, hasUrlFilter, role]);

  // Persist filter selections to sessionStorage so staff can inspect records
  // and return without losing their active filters or page state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasUrlFilter) return;
    if (currentKeyRef.current !== storageKey) return;

    try {
      const payload: SavedFilterState = {
        search: searchInput,
        statuses,
        makes,
        emirates,
        arrivalStatuses,
        page,
      };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [storageKey, hasUrlFilter, searchInput, statuses, makes, emirates, arrivalStatuses, page]);

  // A dashboard pipeline card arrives with a current-stage filter. Keep this
  // in sync on client-side navigation so a second card click cannot retain the
  // previous stage's checkbox selection.
  useEffect(() => {
    if (attentionFilter || requestedStatus) {
      setStatuses(attentionFilter ? [] : requestedStatus ? [requestedStatus] : defaultStatusesForRole(role));
      setPage(1);
    }
  }, [attentionFilter, requestedStatus, role]);

  const filtered = useMemo(() => {
    let result = leads;

    // Apply attention-focused query filter from Executive Dashboard alerts
    if (attentionFilter === "first-contact") {
      const now = Date.now();
      result = result.filter(
        (l) =>
          ["new", "pending"].includes(l.status) &&
          now - new Date(l.createdAt).getTime() > 86_400_000,
      );
    } else if (attentionFilter === "stalled") {
      const now = Date.now();
      const openStatuses = ["new", "pending", "contacted", "inspection_scheduled", "inspected", "negotiating"];
      result = result.filter(
        (l) =>
          openStatuses.includes(l.status) &&
          now - new Date(l.createdAt).getTime() > 3 * 86_400_000,
      );
    } else if (attentionFilter === "missing-car") {
      result = result.filter(
        (l) => !l.make || !l.model || !l.year || !l.make.trim() || !l.model.trim(),
      );
    } else if (attentionFilter === "duplicate") {
      // Show the flagged repeat *and* every visible lead with the same phone.
      // The flagged row alone tells an admin there was a duplicate, but not
      // which earlier submission caused it to be flagged.
      const duplicatePhones = new Set(
        leads.filter((lead) => lead.isDuplicate === true && lead.phoneE164).map((lead) => lead.phoneE164),
      );
      result = result.filter(
        (lead) => lead.isDuplicate === true || Boolean(lead.phoneE164 && duplicatePhones.has(lead.phoneE164)),
      );
    }

    // Pipeline drill-downs carry the same UAE date range used for the
    // dashboard number, so the list count and the clicked card stay exact.
    if (createdRange) {
      result = result.filter((lead) => {
        const day = uaeDayKey(new Date(lead.createdAt));
        return day >= createdRange.from && day <= createdRange.to;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      // Both are optional, not just possibly empty: a purchaser's leads never
      // carry `fullName`/`phoneE164` at all — they're redacted server-side for
      // privacy (see projectLeadForPurchaser) — so this crashed on the very
      // first character typed into the search box for that role.
      result = result.filter(
        (l) => (l.fullName?.toLowerCase().includes(q) ?? false) || (l.phoneE164?.includes(q) ?? false),
      );
    }
    // Within one filter the ticked options are OR'd (show New *or* Pending);
    // across filters they are AND'd (a New lead *and* a Toyota). That is what
    // stacking filters is normally taken to mean, and it is the only reading
    // where adding a tick can never remove a row you could already see.
    if (statuses.length) result = result.filter((l) => statuses.includes(l.status));
    if (makes.length) {
      const selectedMakes = new Set(makes.map((m) => m.trim().toLowerCase()));
      result = result.filter((l) => l.make && selectedMakes.has(l.make.trim().toLowerCase()));
    }
    // `location` is optional on a lead, and a lead with no emirate recorded
    // matches no emirate box — it is unknown, not universal.
    if (emirates.length) result = result.filter((l) => l.location != null && emirates.includes(l.location));
    if (arrivalStatuses.length) result = result.filter((l) => arrivalStatuses.includes(l.arrivalStatus ?? "not_arrived"));

    const sorted = [...result].sort((a, b) => {
      const rankDiff = queuePriority(a.status, role) - queuePriority(b.status, role);
      if (rankDiff !== 0) return rankDiff;

      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "value") cmp = (a.estimatedValueAed ?? 0) - (b.estimatedValueAed ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [leads, search, statuses, makes, emirates, arrivalStatuses, sortKey, sortDir, role, attentionFilter, createdRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  return {
    search: searchInput,
    setSearch: (v: string) => {
      setSearchInput(v);
      setPage(1);
    },
    statuses,
    setStatuses: (v: LeadStatus[]) => {
      setStatuses(v);
      setPage(1);
    },
    makes,
    setMakes: (v: string[]) => {
      setMakes(v);
      setPage(1);
    },
    emirates,
    setEmirates: (v: string[]) => {
      setEmirates(v);
      setPage(1);
    },
    arrivalStatuses,
    setArrivalStatuses: (v: string[]) => {
      setArrivalStatuses(v);
      setPage(1);
    },
    /** True when any filter (search, status, make, emirate, arrival) is narrowing the list. */
    hasFilters:
      searchInput.trim().length > 0 ||
      statuses.length > 0 ||
      makes.length > 0 ||
      emirates.length > 0 ||
      arrivalStatuses.length > 0,
    clearFilters: () => {
      setSearchInput("");
      setSearch("");
      setStatuses([]);
      setMakes([]);
      setEmirates([]);
      setArrivalStatuses([]);
      setPage(1);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
      }
    },
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: (v: number) => {
      setPageSizeState(v);
      setPage(1);
    },
    totalPages,
    pageItems,
    totalCount: filtered.length,
    allFiltered: filtered,
  };
}
