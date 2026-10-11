import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";
import { markPartialLeadAsViewed } from "@/lib/admin/partial-lead";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { addViewedPartialLeadId } from "@/lib/admin/viewed-partial-leads";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });
  }

  // Always track in session cookie so count and highlight persist immediately
  await addViewedPartialLeadId(id);

  if (ADMIN_PREVIEW) {
    return NextResponse.json({ ok: true, preview: true });
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  if (!hasCapability(auth.identity, "viewIncompleteForms")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const success = await markPartialLeadAsViewed(id);
  return NextResponse.json({ ok: true, success });
}
