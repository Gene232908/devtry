import { getSupabaseServer } from "@/lib/supabase/server";
import { buildIdentity, type StaffIdentity, type StaffRole } from "@/lib/auth/permissions";

/**
 * lib/server/require-staff.ts
 *
 * Authorization guard for any authenticated staff route.
 *
 * Unlike middleware (which only checks that a valid JWT exists), this guard
 * answers three questions on every protected API call:
 *   1. Is the caller authenticated?   → 401 if no valid JWT
 *   2. Do they have a profile?        → 403 if no profile row
 *   3. Is their account active?       → 403 if is_active = false
 *
 * Returns a StaffIdentity containing the resolved role and capabilities.
 * Callers use hasCapability() from lib/auth/permissions.ts to gate specific
 * operations after this guard succeeds.
 *
 * Always fails closed — any error condition returns a denial, never a grant.
 */

export type StaffCheck =
  | { ok: true; identity: StaffIdentity }
  | { ok: false; status: 401 | 403; message: string };

export async function requireStaff(): Promise<StaffCheck> {
  const supabase = getSupabaseServer();

  // Verify JWT locally (same approach as middleware.ts and require-admin.ts).
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) {
    return { ok: false, status: 401, message: "Not authenticated." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, is_active, display_name")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    // No profile row = not a staff member. Fail closed.
    return { ok: false, status: 403, message: "No staff account found." };
  }

  if (profile.is_active === false) {
    // Account has been disabled. Even a valid JWT must not grant access.
    return { ok: false, status: 403, message: "Account is disabled. Contact the owner." };
  }

  const role = profile.role as StaffRole;
  const identity = buildIdentity(userId, role, profile.display_name as string | null);

  return { ok: true, identity };
}
