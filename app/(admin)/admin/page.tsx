import AdminDashboardClient from "./dashboard-client";
import { fetchAdminStats, fetchAdminCharts } from "@/lib/admin/queries";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";

export const dynamic = "force-dynamic";

/**
 * Server half of the Overview.
 *
 * The six counters and the two chart series used to be fetched by the browser
 * after this page had already mounted and painted skeletons — two more HTTP
 * calls, each re-entering middleware, before any real number appeared.
 *
 * Both now run here, in parallel, during this render. The client half keeps the
 * hook, so preview mode and any future client-side refresh still work unchanged.
 */
export default async function AdminDashboardPage() {
  // Preview mode renders from the demo dataset inside the hook — handing it a
  // seed of real database figures is exactly what that flag exists to prevent.
  if (ADMIN_PREVIEW) {
    return <AdminDashboardClient />;
  }

  const [statsResult, chartsResult] = await Promise.all([fetchAdminStats(), fetchAdminCharts()]);

  // If either half failed, fall through with no seed and let the hook do what
  // it always did — fetch on mount, and drop to the mock dataset if that fails
  // too. A half-populated Overview would be worse than a brief skeleton.
  if (!statsResult.ok || !chartsResult.ok) {
    return <AdminDashboardClient />;
  }

  return (
    <AdminDashboardClient

      seed={{
        stats: statsResult.data,
        visitors: chartsResult.data.visitors,
        submissions: chartsResult.data.submissions,
        isLive: true,
      }}
    />
  );
}
