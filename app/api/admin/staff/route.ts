import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";
import { staffDraftSchema, staffFieldErrors, type StaffSummary } from "@/lib/admin/staff-schema";
import type { StaffRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

function mapProfile(p: {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  is_active: boolean | null;
}): StaffSummary {
  return {
    id: p.id,
    email: p.email ?? "",
    displayName: p.display_name ?? p.email ?? p.id,
    role: p.role as StaffRole,
    isActive: p.is_active !== false,
  };
}

/**
 * GET /api/admin/staff
 * Returns all staff profiles. Owner-only.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return bad(auth.message, auth.status);

  if (!isSupabaseConfigured()) return bad("Database is not configured.", 503);

  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, email, display_name, role, is_active")
    .order("created_at", { ascending: true });

  if (error) return bad(error.message, 500);

  const staff = (data ?? []).map(mapProfile);
  return NextResponse.json({ ok: true, data: { staff } });
}

/**
 * POST /api/admin/staff
 * Provisions a new staff account: creates Supabase Auth user + profile row.
 * Owner-only.
 *
 * Compensation strategy on partial failure:
 *   If Auth account is created but profile insert fails, we attempt to delete
 *   the Auth user. If cleanup also fails, the orphaned Auth user is logged for
 *   manual resolution — they have no profile so they cannot access anything.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return bad(auth.message, auth.status);

  if (!isSupabaseConfigured()) return bad("Database is not configured.", 503);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const parsed = staffDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { message: "Validation failed.", fields: staffFieldErrors(parsed.error) } },
      { status: 400 },
    );
  }

  const { email, password, displayName, role } = parsed.data;
  
  if (!password) {
    return NextResponse.json(
      { ok: false, error: { message: "Validation failed.", fields: { password: "Password is required." } } },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Step 1: Create Supabase Auth account directly (bypassing invite email limits).
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (authError) {
    // Duplicate email returns a specific message.
    const message =
      authError.message?.toLowerCase().includes("already") ||
      authError.message?.toLowerCase().includes("exists")
        ? "An account with that email already exists."
        : authError.message ?? "Failed to create account.";
    return bad(message, 409);
  }

  const userId = authData.user.id;

  // Step 2: Insert/update the profile row via the provisioning RPC or direct upsert for admin.
  let profileError: { message: string } | null = null;

  if (role === "admin") {
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email,
        display_name: displayName,
        role: "admin",
        is_active: true,
      });
    profileError = upsertErr;
  } else {
    const { error: rpcErr } = await supabase.rpc("provision_staff_account", {
      p_user_id: userId,
      p_email: email,
      p_name: displayName,
      p_role: role,
    });
    profileError = rpcErr;
  }

  if (profileError) {
    // Attempt to clean up the orphaned Auth user.
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(userId);
    if (cleanupError) {
      console.error(
        `[staff/POST] Orphaned Auth user ${userId} after profile failure. ` +
          `Profile error: ${profileError.message}. Cleanup error: ${cleanupError.message}`,
      );
    }
    return bad(`Failed to complete account setup: ${profileError.message}`, 500);
  }

  // Read back the created profile to return consistent shape.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_active")
    .eq("id", userId)
    .single();

  return NextResponse.json(
    { ok: true, data: { staff: profile ? mapProfile(profile) : { id: userId, email, displayName, role, isActive: true } } },
    { status: 201 },
  );
}
