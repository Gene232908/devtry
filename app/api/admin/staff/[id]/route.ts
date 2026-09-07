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

  const { displayName, role, isActive } = parsed.data;
  const supabase = getSupabaseAdmin();

  // Last-owner protection: if deactivating, check the DB guard function.
  if (isActive === false) {
    const { data: wouldRemoveLast, error: guardError } = await supabase.rpc(
      "would_remove_last_owner",
      { p_user_id: targetId },
    );
    if (guardError) return bad(guardError.message, 500);
    if (wouldRemoveLast) {
      return bad("Cannot disable the last active owner account.", 409);
    }
  }

  // Build the update payload (only fields explicitly provided).
  const updates: Record<string, unknown> = {};
  if (displayName !== undefined) updates.display_name = displayName;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.is_active = isActive;

  if (Object.keys(updates).length === 0) {
    return bad("No fields to update.", 400);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", targetId)
    .select("id, email, display_name, role, is_active")
    .single();

  if (error) return bad(error.message, 500);
  if (!data) return bad("Staff member not found.", 404);

  const staff: StaffSummary = {
    id: data.id,
    email: (data.email as string | null) ?? "",
    displayName: (data.display_name as string | null) ?? (data.email as string | null) ?? data.id,
    role: data.role as StaffRole,
    isActive: (data.is_active as boolean | null) !== false,
  };

  return NextResponse.json({ ok: true, data: { staff } });
}
