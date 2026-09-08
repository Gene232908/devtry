"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLeads } from "@/lib/admin/leads-store";
import { LeadDetail } from "@/components/admin/LeadDetail";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { getLead, refresh } = useLeads();
  const lead = getLead(params.id);

  // Re-reads the list once on arriving at a lead, so a status someone else
  // just changed elsewhere (a purchaser recording a Deal, an agent scheduling
  // an inspection) is current the moment this page opens, rather than
  // whatever LeadsProvider last happened to have. The provider only polls
  // while the Leads Directory itself is on screen — a detail page opened
  // straight from a bookmark, or left open since before someone else's
  // change, would otherwise show whatever was true when the dashboard was
  // first loaded until it was closed and reopened.
  //
  // Fires once per lead id, not on every render or poll: `refresh`'s identity
  // changes on every fetch (it closes over `allLeads`), so it is read through
  // a ref rather than listed as a dependency — depending on it directly would
  // refire this effect after every refresh it triggers, forever.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    void refreshRef.current();
  }, [params.id]);

  if (!lead) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-fluid-1 text-text">Lead not found.</p>
        <Link href="/admin/leads" className="text-gold hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }

  return <LeadDetail lead={lead} />;
}
