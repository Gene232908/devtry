import InventoryClient from "./inventory-client";
import { fetchInventory } from "@/lib/admin/queries";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoInventory } from "@/config/demo-admin-data";

// Admin data must never be cached or prerendered — the figures here are money.
export const dynamic = "force-dynamic";

/**
 * Server half of the Inventory screen.
 *
 * This page used to be a Client Component that mounted empty and then called
 * `/api/admin/inventory` over HTTP. That request went back out through
 * middleware, paying a second auth check, before it ever reached the query —
 * so a single visit cost two serial trips through auth plus the query itself.
 *
 * Fetching here collapses that: the query runs during this render, in the same
 * process, already past the middleware check that let this navigation through.
 * The client half still owns all the interaction (filters, Mark sold, Refresh).
 */
export default async function AdminInventoryPage() {
  // Preview mode never reads the database — see lib/admin/preview-mode.ts.
  if (ADMIN_PREVIEW) {
    return <InventoryClient initialItems={demoInventory} initialError={null} />;
  }

  const result = await fetchInventory();

  return (
    <InventoryClient
      initialItems={result.ok ? result.data.items : []}
      // Surfaced rather than thrown: a database problem should leave the screen
      // usable, with Refresh available, not replace it with an error page.
      initialError={result.ok ? null : result.message}
    />
  );
}
