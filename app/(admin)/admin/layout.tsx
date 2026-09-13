import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/server/require-staff";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { buildIdentity, type StaffRole } from "@/lib/auth/permissions";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Server layout — resolves the viewer's identity once per navigation and
 * hands it to the client shell for sidebar filtering, topbar display, and
 * capability-gated UI throughout the admin area.
 *
 * Performance: the middleware already caches role in the `cvd_role` cookie
 * (written after the first profiles query, valid for 1 hour). We read it here
 * to skip the DB round-trip that requireStaff() would otherwise make on every
 * sidebar navigation. The JWT sub is read from the session locally (no network).
 * Display name is fetched once if missing from the dedicated display-name cookie.
 * Real authorization still happens per-page in requireStaff()/requireAdmin().
 */
const VALID_ROLES = new Set(["admin", "manager", "call_center", "purchaser"]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (ADMIN_PREVIEW) {
    const identity = buildIdentity("preview", "admin", "Preview Admin");
    return <AdminShell identity={identity}>{children}</AdminShell>;
  }

  const cookieStore = cookies();
  const roleCookie = cookieStore.get("cvd_role")?.value ?? "";
  const nameCookie = cookieStore.get("cvd_display_name")?.value ?? "";

  // Fast path: role cookie set by middleware is still valid — derive identity
  // from cookies without any DB round-trip. The JWT verification already happened
  // in middleware; real authorization is re-checked per page/API call.
  if (VALID_ROLES.has(roleCookie)) {
    const pwCheckedCookie = cookieStore.get("cvd_pw_checked")?.value;
    let userId = pwCheckedCookie || "unknown";
    const displayName = nameCookie || null;
    if (userId === "unknown") {
      try {
        const supabase = getSupabaseServer();
        const { data: claims } = await supabase.auth.getClaims();
        if (claims?.claims.sub) userId = claims.claims.sub;
      } catch {
        // Middleware already verified the token — safe to continue.
      }
    }

    const identity = buildIdentity(userId, roleCookie as StaffRole, displayName);
    return <AdminShell identity={identity}>{children}</AdminShell>;
  }

  // Slow path (first load or cookie expired): full DB check via requireStaff().
  const auth = await requireStaff().catch(() => ({ ok: false as const, status: 401 as const, message: "Not authenticated." }));
  const identity = auth.ok ? auth.identity : null;
  return <AdminShell identity={identity}>{children}</AdminShell>;
}
