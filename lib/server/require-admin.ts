import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Answers "is the caller a signed-in admin?" for a Route Handler.
 *
 * Middleware already refuses an unauthenticated request to /api/admin/*, so
 * this exists for the second question it does not ask: WHICH staff member.
 * `profiles.role` distinguishes 'admin' from 'manager', and several tables —
 * settings among them — are admin-write, manager-read in RLS.
 *
 * That distinction would otherwise be lost, because these routes do their work
 * through the service-role client, which bypasses RLS entirely. A policy that
 * says "admins only" therefore protects the browser and nothing else; without
 * this check a signed-in manager calling the route directly would be writing
 * with service-role privileges the policy was written to deny them.
 *
 * Reads the role through the caller's own cookie session (RLS applies), never
 * from anything the client sent.
 */
export type AdminCheck =
  | { ok: true; userId: string }
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
    .select("role")
    .eq("id", userId)
    .single();

  // A failed lookup is treated as "not an admin". Failing closed is the only
  // safe direction for an authorization check.
  if (error || profile?.role !== "admin") {
    return { ok: false, status: 403, message: "Admins only." };
  }

  return { ok: true, userId };
}
