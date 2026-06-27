"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useLeads } from "@/lib/admin/leads-store";
import { LeadDetail } from "@/components/admin/LeadDetail";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { getLead } = useLeads();
  const lead = getLead(params.id);

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
