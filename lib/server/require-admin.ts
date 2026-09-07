import { getSupabaseServer } from "@/lib/supabase/server";
import { buildIdentity, type StaffIdentity } from "@/lib/auth/permissions";

/**
 * Answers "is the caller a signed-in, active owner?" for a Route Handler.
 *
 * Middleware already refuses an unauthenticated request to /api/admin/*, so
 * this exists for the second question it does not ask: WHICH staff member.
 * `profiles.role` distinguishes 'admin'/'manager' (owners) from operational
 * roles, and several tables — settings, commission — are admin-write in RLS.
 *
 * That distinction would otherwise be lost, because these routes do their work
 * through the service-role client, which bypasses RLS entirely. A policy that
 * says "admins only" therefore protects the browser and nothing else; without
 * this check a signed-in operational staff member calling the route directly
 * would be writing with service-role privileges the policy was written to deny.
 *
 * Also checks is_active: a disabled account must fail even with an unexpired
 * JWT, within the normal ~1-hour middleware detection window.
 *
 * Reads role/active state through the caller's own cookie session (RLS
 * applies), never from anything the client sent.
 */
export type AdminCheck =
  | { ok: true; userId: string; identity: StaffIdentity }
  | { ok: false; status: 401 | 403; message: string };

export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = getSupabaseServer();

  // getClaims() verifies the JWT signature locally rather than calling the auth
  // server, matching how middleware.ts authenticates every other admin route.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { ok: false, status: 401, message: "Not authenticated." };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, is_active, display_name")
    .eq("id", userId)
    .single();

  // A failed lookup is treated as "not an admin". Failing closed is the only
  // safe direction for an authorization check.
  if (error || !profile) {
    return { ok: false, status: 403, message: "Admins only." };
  }

  const role = profile.role as string;
  // Owners are 'admin' or 'manager' (legacy full-access role).
  if (role !== "admin" && role !== "manager") {
    return { ok: false, status: 403, message: "Admins only." };
  }

  // Disabled accounts must fail even with a valid JWT.
  if (profile.is_active === false) {
    return { ok: false, status: 403, message: "Account is disabled. Contact the owner." };
  }

  const identity = buildIdentity(
    userId,
    role as "admin" | "manager",
    profile.display_name as string | null,
  );

  return { ok: true, userId, identity };
}
