import CommissionClient from "./commission-client";
import { fetchCommissionStatements, fetchStaffCommission } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
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
    return (
      <CommissionClient
        initialStatements={demoCommissionStatements}
        initialError={null}
      />
    );
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    // Should never happen because middleware redirects unauthenticated users,
    // but the types require handling this.
    return <div>Not authorized</div>;
  }

  const isOwner = auth.identity.role === "admin" || auth.identity.role === "manager";

  // The developer ledger is a contract between the owner and the developer —
  // requireAdmin() already refuses it at GET /api/admin/commission for an
  // operational role, but this page used to call fetchCommissionStatements()
  // unconditionally for every visitor and hand the result to the client
  // component as a prop regardless of whether the UI ever rendered it. That
  // put the whole company's developer commission figures into a call centre
  // agent's or purchaser's page payload — visible in React DevTools or a page
  // source view even though no button on their screen ever showed it. Fetched
  // only for owners now, matching the API route's own rule.
  const [statementsResult, staffResult] = await Promise.all([
    isOwner ? fetchCommissionStatements() : Promise.resolve(null),
    fetchStaffCommission(auth.identity),
  ]);

  return (
    <CommissionClient
      initialStatements={statementsResult?.ok ? statementsResult.data.statements : []}
      initialError={statementsResult && !statementsResult.ok ? statementsResult.message : null}
      initialAgents={staffResult.ok ? staffResult.data.agents : []}
      initialPurchasers={staffResult.ok ? staffResult.data.purchasers : []}
    />
  );
}
