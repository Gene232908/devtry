import { Suspense } from "react";
import ExpensesClient from "./expenses-client";
import { fetchCompanyExpenses, demoExpenses, calculateExpensesSummary } from "@/lib/admin/expenses";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  if (ADMIN_PREVIEW) {
    return (
      <Suspense fallback={null}>
        <ExpensesClient
          initialItems={demoExpenses}
          initialSummary={calculateExpensesSummary(demoExpenses)}
          initialError={null}
        />
      </Suspense>
    );
  }

  const auth = await requireStaff();
  const authorized = auth.ok && hasCapability(auth.identity, "viewInventory");
  const result = authorized
    ? await fetchCompanyExpenses(auth.identity)
    : {
        ok: false as const,
        data: { items: [], summary: calculateExpensesSummary([]) },
        error: auth.ok ? "Not authorized to view company expenses." : "Not authenticated.",
      };

  return (
    <Suspense fallback={null}>
      <ExpensesClient
        initialItems={result.ok ? result.data.items : []}
        initialSummary={result.data.summary}
        initialError={result.ok ? null : (result.error ?? "Failed to load expenses.")}
      />
    </Suspense>
  );
}
