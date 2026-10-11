import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/require-staff";
import { getUnviewedPartialLeadsCount } from "@/lib/admin/partial-lead";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoPartialLeads } from "@/config/demo-admin-data";
import { getViewedPartialLeadIds } from "@/lib/admin/viewed-partial-leads";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireStaff().catch(() => ({ ok: false as const, status: 401 as const, message: "Unauthorized" }));

  if (!auth.ok) {
    if (ADMIN_PREVIEW) {
      const cookieViewedIds = await getViewedPartialLeadIds("admin");
      const queryViewed = request.nextUrl.searchParams.get("viewed");
      const queryViewedIds = queryViewed
        ? queryViewed.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const viewedIds = Array.from(new Set([...cookieViewedIds, ...queryViewedIds]));
      const count = demoPartialLeads.filter(
        (row) => row.status === "new" && !row.viewed_at && !viewedIds.includes(row.id),
      ).length;
      return NextResponse.json({ ok: true, count });
    }
    return NextResponse.json({ ok: false, count: 0 }, { status: 401 });
  }

  const role = auth.identity.role;
  const cookieViewedIds = await getViewedPartialLeadIds(role);
  const queryViewed = request.nextUrl.searchParams.get("viewed");
  const queryViewedIds = queryViewed
    ? queryViewed.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const viewedIds = Array.from(new Set([...cookieViewedIds, ...queryViewedIds]));

  if (ADMIN_PREVIEW) {
    const count = demoPartialLeads.filter(
      (row) => row.status === "new" && !row.viewed_at && !viewedIds.includes(row.id),
    ).length;
    return NextResponse.json({ ok: true, count });
  }

  const count = await getUnviewedPartialLeadsCount(auth.identity, viewedIds);
  return NextResponse.json({ ok: true, count });
}
