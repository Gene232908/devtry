import IncompleteValuationsClient from "./incomplete-client";
import { fetchPartialLeads } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoPartialLeads } from "@/config/demo-admin-data";

export const dynamic = "force-dynamic";

/**
 * Server half of Incomplete Forms. See `inventory/page.tsx` for why the fetch
 * moved here: a client-side fetch had to travel back out through middleware and
 * pay a second auth check before reaching the same query this now runs inline.
 */
export default async function AdminIncompletePage() {
  // Preview mode never reads the database — these are unverified captured
  // numbers, so this guard matters more here than anywhere else.
  if (ADMIN_PREVIEW) {
    return <IncompleteValuationsClient initialRows={demoPartialLeads} initialError={null} />;
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    // Should never happen because middleware redirects unauthenticated users,
    // but the types require handling this.
    return <div>Not authorized</div>;
  }

  const result = await fetchPartialLeads(auth.identity);

  return (
    <IncompleteValuationsClient
      initialRows={result.ok ? result.data.partialLeads : []}
      initialError={result.ok ? null : result.message}
    />
  );
}
