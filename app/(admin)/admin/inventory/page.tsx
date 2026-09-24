import { Suspense } from "react";
import InventoryClient from "./inventory-client";
import { fetchInventory } from "@/lib/admin/queries";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoInventory } from "@/config/demo-admin-data";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";

// Admin data must never be cached or prerendered — the figures here are money.
export const dynamic = "force-dynamic";

/**
 * Server half of the Inventory screen.
 */
export default async function AdminInventoryPage() {
  // Preview mode never reads the database — see lib/admin/preview-mode.ts.
  if (ADMIN_PREVIEW) {
    return (
      <Suspense fallback={null}>
        <InventoryClient initialItems={demoInventory} initialError={null} />
      </Suspense>
    );
  }

  const auth = await requireStaff();
  const result = auth.ok && hasCapability(auth.identity, "viewInventory")
    ? await fetchInventory(undefined, auth.identity)
    : { ok: false as const, message: auth.ok ? "Not authorized to view inventory." : "Not authenticated.", status: auth.ok ? 403 : 401 };

  return (
    <Suspense fallback={null}>
      <InventoryClient
        initialItems={result.ok ? result.data.items : []}
        // Surfaced rather than thrown: a database problem should leave the screen
        // usable, with Refresh available, not replace it with an error page.
        initialError={result.ok ? null : result.message}
      />
    </Suspense>
  );
}
