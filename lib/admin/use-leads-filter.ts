"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, LeadStatus } from "@/config/mock-data";

export type SortKey = "date" | "value";

export function useLeadsFilter(leads: Lead[]) {
  // searchInput updates the text box instantly; search (debounced) drives
  // filtering, so typing doesn't re-filter/re-sort/re-render on every keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // Status, make and emirate are multi-select. An EMPTY array means "no filter"
  // rather than "match nothing" — an untouched control should show everything,
  // and unticking the last box has to return the full list rather than strand
  // the user on an empty table.
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
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
      result = result.filter((l) => l.fullName.toLowerCase().includes(q) || l.phoneE164.includes(q));
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
      // New always floats to the top, whatever else is selected — untouched
      // leads are the ones that lose money by sitting unseen, so no column sort
      // is allowed to bury them. Everything below sorts normally.
      const aIsNew = a.status === "new" ? 0 : 1;
      const bIsNew = b.status === "new" ? 0 : 1;
      if (aIsNew !== bIsNew) return aIsNew - bIsNew;

      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "value") cmp = (a.estimatedValueAed ?? 0) - (b.estimatedValueAed ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [leads, search, statuses, makes, emirates, sortKey, sortDir]);

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
