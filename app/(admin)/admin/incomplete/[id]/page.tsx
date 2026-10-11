import Link from "next/link";
import { PartialLeadDetail } from "@/components/admin/PartialLeadDetail";
import { fetchPartialLead } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoPartialLeads } from "@/config/demo-admin-data";
import { markPartialLeadAsViewed } from "@/lib/admin/partial-lead";
import { addViewedPartialLeadId } from "@/lib/admin/viewed-partial-leads";

export const dynamic = "force-dynamic";

export default async function IncompleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  await addViewedPartialLeadId(resolvedParams.id);

  if (ADMIN_PREVIEW) {
    const fallback = demoPartialLeads.find((row) => row.id === resolvedParams.id) ?? null;
    if (!fallback) return <NotFound />;
    if (!fallback.viewed_at && fallback.status !== "converted") {
      fallback.viewed_at = new Date().toISOString();
    }
    return <PartialLeadDetail partial={fallback} />;
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    return <div>Not authorized</div>;
  }

  const result = await fetchPartialLead(resolvedParams.id, auth.identity);
  if (!result.ok) {
    const fallback = demoPartialLeads.find((row) => row.id === resolvedParams.id) ?? null;
    if (fallback) {
      return <PartialLeadDetail partial={fallback} />;
    }
    return <NotFound />;
  }

  // Mark viewed in database asynchronously upon server page render
  await markPartialLeadAsViewed(resolvedParams.id);
  const partial = {
    ...result.data.partialLead,
    viewed_at: result.data.partialLead.viewed_at ?? new Date().toISOString(),
  };

  return <PartialLeadDetail partial={partial} />;
}

function NotFound() {
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
