import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";
import { staffPatchSchema, staffFieldErrors, type StaffSummary } from "@/lib/admin/staff-schema";
import type { StaffRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

/**
 * PATCH /api/admin/staff/[id]
 * Rename, change role, or toggle is_active for a staff account.
 * Owner-only.
 *
 * Enforces:
 *   - Cannot disable the last active owner (admin/manager).
 *   - Cannot promote self or others to admin via this endpoint.
 *   - Uses disable instead of delete to preserve financial history.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return bad(auth.message, auth.status);

  if (!isSupabaseConfigured()) return bad("Database is not configured.", 503);

  const { id: targetId } = await params;
  if (!targetId) return bad("Staff ID is required.");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const parsed = staffPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { message: "Validation failed.", fields: staffFieldErrors(parsed.error) } },
      { status: 400 },
    );
  }

  const { email, password, displayName, role, isActive } = parsed.data;
  const supabase = getSupabaseAdmin();

  // Fetch target profile first to check existence and current values
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_active")
    .eq("id", targetId)
    .single();

  if (targetError || !targetProfile) {
    return bad("Staff member not found.", 404);
  }

  // Pre-flight duplicate email check if email is changing
  const targetCurrentEmail = (targetProfile.email ?? "").trim().toLowerCase();
  const nextEmail = email ? email.trim().toLowerCase() : "";
  const isEmailChanging = nextEmail.length > 0 && nextEmail !== targetCurrentEmail;

  if (isEmailChanging) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", nextEmail)
      .neq("id", targetId)
      .maybeSingle();

    if (existingProfile) {
      return bad("An account with that email address already exists.", 409);
    }
  }

  // Last-owner protection:
  // If deactivating or demoting an owner away from admin/manager, verify we don't leave zero owners.
  if (isActive === false || (role !== undefined && role !== "admin" && role !== "manager")) {
    const isCurrentOwner =
      (targetProfile.role === "admin" || targetProfile.role === "manager") &&
      targetProfile.is_active !== false;

    if (isCurrentOwner) {
      const { data: wouldRemoveLast, error: guardError } = await supabase.rpc(
        "would_remove_last_owner",
        { p_user_id: targetId },
      );
      if (guardError) return bad(guardError.message, 500);
      if (wouldRemoveLast) {
        return bad(
          isActive === false
            ? "Cannot disable the last active owner account."
            : "Cannot demote the last active owner account.",
          409,
        );
      }
    }
  }

  // Update Auth credentials if email (when changed), password, or display name is provided
  const authUpdates: {
    email?: string;
    password?: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, unknown>;
  } = {};

  if (isEmailChanging && email) {
    authUpdates.email = email.trim();
    authUpdates.email_confirm = true;
  }
  if (password && password.trim().length >= 6) {
    authUpdates.password = password.trim();
  }
  if (displayName && displayName.trim().length > 0) {
    authUpdates.user_metadata = { display_name: displayName.trim() };
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await supabase.auth.admin.updateUserById(targetId, authUpdates);
    if (authError) {
      const rawMsg = authError.message ?? "";
      const isAlready =
        rawMsg.toLowerCase().includes("already") ||
        rawMsg.toLowerCase().includes("exists") ||
        rawMsg.toLowerCase().includes("duplicate") ||
        rawMsg === "{}" ||
        authError.status === 422 ||
        authError.status === 500;

      const message = isAlready
        ? "An account with that email address already exists."
        : rawMsg && rawMsg !== "{}"
          ? rawMsg
          : "Failed to update user credentials.";
      return bad(message, 400);
    }
  }

  // Build the profile update payload (only fields explicitly provided).
  const updates: Record<string, unknown> = {};
  if (email !== undefined) updates.email = email.trim();
  if (displayName !== undefined) updates.display_name = displayName.trim();
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.is_active = isActive;

  let profileData: { id: string; email: string | null; display_name: string | null; role: string; is_active: boolean | null } | null = null;

  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", targetId)
      .select("id, email, display_name, role, is_active")
      .single();

    if (error) return bad(error.message, 500);
    profileData = data;
  } else if (Object.keys(authUpdates).length > 0) {
    // If only credentials were changed
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, is_active")
      .eq("id", targetId)
      .single();

    if (error) return bad(error.message, 500);
    profileData = data;
  } else {
    return bad("No fields to update.", 400);
  }

  if (!profileData) return bad("Staff member not found.", 404);

  const staff: StaffSummary = {
    id: profileData.id,
    email: profileData.email ?? "",
    displayName: profileData.display_name ?? profileData.email ?? profileData.id,
    role: profileData.role as StaffRole,
    isActive: profileData.is_active !== false,
  };

  return NextResponse.json({ ok: true, data: { staff } });
}
