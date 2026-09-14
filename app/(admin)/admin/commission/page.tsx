import { Suspense } from "react";
import CommissionClient from "./commission-client";
import { fetchCommissionStatements, fetchStaffCommission } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoCommissionStatements } from "@/config/demo-admin-data";

export const dynamic = "force-dynamic";

export default async function AdminCommissionPage() {
  if (ADMIN_PREVIEW) {
    return (
      <Suspense fallback={null}>
        <CommissionClient
          initialStatements={demoCommissionStatements}
          initialError={null}
        />
      </Suspense>
    );
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    return <div>Not authorized</div>;
  }

  const isOwner = auth.identity.role === "admin" || auth.identity.role === "manager";

  const [statementsResult, staffResult] = await Promise.all([
    isOwner ? fetchCommissionStatements() : Promise.resolve(null),
    fetchStaffCommission(auth.identity),
  ]);

  return (
    <Suspense fallback={null}>
      <CommissionClient
        initialStatements={statementsResult?.ok ? statementsResult.data.statements : []}
        initialError={statementsResult && !statementsResult.ok ? statementsResult.message : null}
        initialAgents={staffResult.ok ? staffResult.data.agents : []}
        initialPurchasers={staffResult.ok ? staffResult.data.purchasers : []}
        initialReferralRecipients={staffResult.ok ? staffResult.data.referralRecipients : []}
      />
    </Suspense>
  );
}
