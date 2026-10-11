import { Suspense } from "react";
import IncompleteValuationsClient from "./incomplete-client";
import { fetchPartialLeads } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoPartialLeads } from "@/config/demo-admin-data";
import { getViewedPartialLeadIds } from "@/lib/admin/viewed-partial-leads";

export const dynamic = "force-dynamic";

export default async function AdminIncompletePage() {
  const viewedIds = await getViewedPartialLeadIds();

  if (ADMIN_PREVIEW) {
    const initialRows = demoPartialLeads.map((row) =>
      viewedIds.includes(row.id) ? { ...row, viewed_at: row.viewed_at ?? new Date().toISOString() } : row,
    );
    return (
      <Suspense fallback={null}>
        <IncompleteValuationsClient initialRows={initialRows} initialError={null} />
      </Suspense>
    );
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    return <div>Not authorized</div>;
  }

  const result = await fetchPartialLeads(auth.identity);
  const rawRows = result.ok ? result.data.partialLeads : [];
  const initialRows = rawRows.map((row) =>
    viewedIds.includes(row.id) ? { ...row, viewed_at: row.viewed_at ?? new Date().toISOString() } : row,
  );

  return (
    <Suspense fallback={null}>
      <IncompleteValuationsClient
        initialRows={initialRows}
        initialError={result.ok ? null : result.message}
      />
    </Suspense>
  );
}
