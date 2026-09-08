"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, LeadStatus } from "@/config/mock-data";
import type { StaffRole } from "@/lib/auth/permissions";
import { AGENT_STATUS_CHOICES, PURCHASER_VISIBLE_STATUSES } from "@/lib/auth/lead-visibility";
import { FILTER_STATUS_OPTIONS } from "@/lib/format";

export type SortKey = "date" | "value";

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
 * The status filter an operational role lands on, so the first thing they see
 * is what actually needs doing — a brand new lead for an agent, a freshly
 * scheduled one for a purchaser — rather than their whole history including
 * work that is already finished.
 *
 * Deliberately a single preset status, not "everything except done": the
 * status filter itself (see `filterStatusOptionsForRole`) is how they widen
 * this back out, to review Contacted leads still being worked or to backtrack
 * through what they already closed — ticking more boxes there, including the
 * role's own "done" status, is the whole point of it being a filter and not a
 * permanent view.
 */
function defaultStatusesForRole(role: StaffRole | undefined): LeadStatus[] {
  if (role === "call_center") return ["new"];
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

export function useLeadsFilter(leads: Lead[], role?: StaffRole) {
  // searchInput updates the text box instantly; search (debounced) drives
  // filtering, so typing doesn't re-filter/re-sort/re-render on every keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // Status, make and emirate are multi-select. An EMPTY array means "no filter"
  // rather than "match nothing" — an untouched control should show everything,
  // and unticking the last box has to return the full list rather than strand
  // the user on an empty table. Statuses starts pre-set for an operational
  // role instead of empty (see `defaultStatusesForRole`) — the one case where
  // "no filter chosen yet" and "the landing view" are deliberately different.
  const [statuses, setStatuses] = useState<LeadStatus[]>(() => defaultStatusesForRole(role));
  const [makes, setMakes] = useState<string[]>([]);
  const [emirates, setEmirates] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(6);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = useMemo(() => {
    let result = leads;
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
    if (makes.length) result = result.filter((l) => makes.includes(l.make));
    // `location` is optional on a lead, and a lead with no emirate recorded
    // matches no emirate box — it is unknown, not universal.
    if (emirates.length) result = result.filter((l) => l.location != null && emirates.includes(l.location));

    const sorted = [...result].sort((a, b) => {
      const rankDiff = queuePriority(a.status, role) - queuePriority(b.status, role);
      if (rankDiff !== 0) return rankDiff;

      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "value") cmp = (a.estimatedValueAed ?? 0) - (b.estimatedValueAed ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [leads, search, statuses, makes, emirates, sortKey, sortDir, role]);

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
    /** True when any of the three multi-selects is narrowing the list. */
    hasFilters: statuses.length > 0 || makes.length > 0 || emirates.length > 0,
    clearFilters: () => {
      setStatuses([]);
      setMakes([]);
      setEmirates([]);
      setPage(1);
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
