import { ExecutiveDashboard } from "@/components/admin/ExecutiveDashboard";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";

/**
 * Dashboard page — renders immediately.
 *
 * Data is fetched client-side by the hook in ExecutiveDashboard, which has an
 * in-memory cache. Switching back to this page after visiting another is
 * instant (cache hit). The loading skeleton shows only on the very first visit.
 *
 * Previously this page ran requireAdmin() + fetchExecutiveOverview() on every
 * SSR render — 2 serial Supabase round-trips adding 400–800ms to every
 * navigation to /admin. Removing the SSR seed cuts that to zero.
 */

export default function AdminDashboardPage() {
  if (ADMIN_PREVIEW) {
    return <ExecutiveDashboard />;
  }
  return <ExecutiveDashboard />;
}
