import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";
import { fetchCompanyExpenses } from "@/lib/admin/expenses";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  if (!hasCapability(auth.identity, "viewInventory")) {
    return NextResponse.json(
      { ok: false, error: { message: "Not authorized to view expenses." } },
      { status: 403 },
    );
  }

  const result = await fetchCompanyExpenses(auth.identity);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { message: result.error ?? "Failed to fetch expenses." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}
