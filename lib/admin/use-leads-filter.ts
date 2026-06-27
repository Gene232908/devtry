"use client";

import { useMemo, useState } from "react";
import { Lead, LeadStatus } from "@/config/mock-data";

export type SortKey = "date" | "mobile" | "value";

export function useLeadsFilter(leads: Lead[]) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [make, setMake] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    let result = leads;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => l.fullName.toLowerCase().includes(q) || l.phoneE164.includes(q));
    }
    if (status !== "all") result = result.filter((l) => l.status === status);
    if (make !== "all") result = result.filter((l) => l.make === make);

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "mobile") cmp = a.phoneE164.localeCompare(b.phoneE164);
      if (sortKey === "value") cmp = (a.estimatedValueAed ?? 0) - (b.estimatedValueAed ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [leads, search, status, make, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

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
    search,
    setSearch: (v: string) => {
      setSearch(v);
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
    sortKey,
    sortDir,
    toggleSort,
    page,
    setPage,
    totalPages,
    pageItems,
    totalCount: filtered.length,
    allFiltered: filtered,
  };
}
