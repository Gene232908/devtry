import { NextResponse } from "next/server";
import { fetchStaffCommission } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET — agent and purchaser commission, split by role.
 *
 * Unlike GET /api/admin/commission (the developer ledger, admin-only), this is
 * every staff role's own "My Commission" screen, so it is gated on
 * `viewCommissions` rather than `requireAdmin()`. Row scoping to "just me" for
 * an operational role happens inside `fetchStaffCommission`, driven by the
 * caller's own identity — never by anything the client could pass in.
 */
export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  if (!hasCapability(auth.identity, "viewCommissions")) {
    return NextResponse.json({ ok: false, error: { message: "Not authorized." } }, { status: 403 });
  }

  const result = await fetchStaffCommission(auth.identity);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
