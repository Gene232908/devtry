import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/require-staff";
import { getUnviewedPartialLeadsCount } from "@/lib/admin/partial-lead";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoPartialLeads } from "@/config/demo-admin-data";
import { getViewedPartialLeadIds } from "@/lib/admin/viewed-partial-leads";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieViewedIds = await getViewedPartialLeadIds();
  const queryViewed = request.nextUrl.searchParams.get("viewed");
  const queryViewedIds = queryViewed
    ? queryViewed.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const viewedIds = Array.from(new Set([...cookieViewedIds, ...queryViewedIds]));

  if (ADMIN_PREVIEW) {
    const count = demoPartialLeads.filter(
      (row) => row.status === "new" && !row.viewed_at && !viewedIds.includes(row.id)
    ).length;
    return NextResponse.json({ ok: true, count });
  }

  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, count: 0 }, { status: 401 });
  }

  const count = await getUnviewedPartialLeadsCount(auth.identity, viewedIds);
  return NextResponse.json({ ok: true, count });
}
