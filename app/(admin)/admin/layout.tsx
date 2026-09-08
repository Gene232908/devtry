import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/server/require-staff";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { buildIdentity } from "@/lib/auth/permissions";

/**
 * Server layout — resolves the viewer's identity once per navigation and
 * hands it to the client shell for sidebar filtering, topbar display, and
 * capability-gated UI throughout the admin area.
 *
 * In preview mode a synthetic Super Admin identity is used so every tab is
 * visible in the walkthrough.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let identity = null;

  if (ADMIN_PREVIEW) {
    // Preview mode: show everything as Super Admin
    identity = buildIdentity("preview", "admin", "Preview Admin");
  } else {
    const auth = await requireStaff();
    if (auth.ok) {
      identity = auth.identity;
    }
  }

  return <AdminShell identity={identity}>{children}</AdminShell>;
}
