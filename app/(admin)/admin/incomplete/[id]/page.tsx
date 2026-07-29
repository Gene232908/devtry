"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PartialLeadDetail } from "@/components/admin/PartialLeadDetail";
import type { PartialLead } from "@/lib/admin/partial-lead";

export default function IncompleteDetailPage() {
  const params = useParams<{ id: string }>();
  const [partial, setPartial] = useState<PartialLead | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetched per-page rather than held in a provider like leads: this list is
  // small, rarely visited, and nothing else in the admin needs it in memory.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/admin/partial-leads/${params.id}`, { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && res.ok && body.ok) setPartial(body.data.partialLead);
      } catch {
        // falls through to the not-found state below
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return <p className="py-20 text-center text-fluid--1 text-text-muted">Loading…</p>;
  }

  if (!partial) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-fluid-1 text-text">Incomplete form not found.</p>
        <p className="text-fluid--1 text-text-muted">
          It may have been deleted, or the person has since completed the form and become a lead.
        </p>
        <Link href="/admin/incomplete" className="text-gold hover:underline">
          Back to incomplete forms
        </Link>
      </div>
    );
  }

  return <PartialLeadDetail partial={partial} />;
}
