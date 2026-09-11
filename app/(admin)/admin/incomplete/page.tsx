import { Suspense } from "react";
import IncompleteValuationsClient from "./incomplete-client";
import { fetchPartialLeads } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoPartialLeads } from "@/config/demo-admin-data";

export const dynamic = "force-dynamic";

export default async function AdminIncompletePage() {
  if (ADMIN_PREVIEW) {
    return (
      <Suspense fallback={null}>
        <IncompleteValuationsClient initialRows={demoPartialLeads} initialError={null} />
      </Suspense>
    );
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    return <div>Not authorized</div>;
  }

  const result = await fetchPartialLeads(auth.identity);

  return (
    <Suspense fallback={null}>
      <IncompleteValuationsClient
        initialRows={result.ok ? result.data.partialLeads : []}
        initialError={result.ok ? null : result.message}
      />
    </Suspense>
  );
}
