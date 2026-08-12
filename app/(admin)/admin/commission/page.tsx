import CommissionClient from "./commission-client";
import { fetchCommissionStatements } from "@/lib/admin/queries";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoCommissionStatements } from "@/config/demo-admin-data";

// Never cached: statements are rebuilt on read so the open month stays live as
// cars sell, and these are the figures the developer is actually paid on.
export const dynamic = "force-dynamic";

/**
 * Server half of the Commission screen.
 *
 * The biggest win of the four pages moved this way. Building the statements
 * issues one sequential `build_commission_statement` RPC per month since the
 * first sale; behind a client fetch, that whole chain started only after a
 * second trip through middleware and a second auth check. It now runs during
 * this render, in-process, on a request already past that check.
 */
export default async function AdminCommissionPage() {
  if (ADMIN_PREVIEW) {
    return <CommissionClient initialStatements={demoCommissionStatements} initialError={null} />;
  }

  const result = await fetchCommissionStatements();

  return (
    <CommissionClient
      initialStatements={result.ok ? result.data.statements : []}
      initialError={result.ok ? null : result.message}
    />
  );
}
