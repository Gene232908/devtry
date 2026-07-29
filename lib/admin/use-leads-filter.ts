"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, LeadStatus } from "@/config/mock-data";

export type SortKey = "date" | "value";

export function useLeadsFilter(leads: Lead[]) {
  // searchInput updates the text box instantly; search (debounced) drives
  // filtering, so typing doesn't re-filter/re-sort/re-render on every keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [make, setMake] = useState<string>("all");
  const [emirate, setEmirateState] = useState<string>("all");
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
    if (status !== "all") result = result.filter((l) => l.status === status);
    if (make !== "all") result = result.filter((l) => l.make === make);
    if (emirate !== "all") result = result.filter((l) => l.location === emirate);

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
  }, [leads, search, status, make, emirate, sortKey, sortDir]);

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
    status,
    setStatus: (v: LeadStatus | "all") => {
      setStatus(v);
      setPage(1);
    },
    make,
    setMake: (v: string) => {
      setMake(v);
      setPage(1);
    },
    emirate,
    setEmirate: (v: string) => {
      setEmirateState(v);
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
