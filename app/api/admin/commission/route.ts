import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { fetchCommissionStatements } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

/**
 * GET — every monthly statement, rebuilding the open ones first.
 *
 * The work lives in lib/admin/queries.ts so the Commission page can run it
 * during its own server render rather than loading empty and calling this route
 * over HTTP. Unchanged for callers; still the path used by Refresh and by the
 * issue/mark-paid actions that reload afterwards.
 */
export async function GET() {
  const result = await fetchCommissionStatements();

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}

/**
 * PATCH — issue or mark paid. Accepts several ids so a whole quarter settles in
 * one action, which is how the developer is actually paid.
 */
export async function PATCH(req: NextRequest) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  let body: { ids?: unknown; status?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: { message: "No statements selected." } }, { status: 400 });
  }

  if (body.status !== "issued" && body.status !== "paid") {
    return NextResponse.json(
      { ok: false, error: { message: "A statement can only move to issued or paid." } },
      { status: 400 },
    );
  }

  const note = typeof body.note === "string" && body.note.trim() !== "" ? body.note.trim() : null;
  const supabase = getSupabaseAdmin();
  const updated: string[] = [];

  for (const id of ids) {
    const { error } = await supabase.rpc("set_commission_statement_status", {
      p_id: id,
      p_status: body.status,
      p_note: note,
    });

    if (error) {
      // Report what did land before the failure — a partly-settled quarter is
      // exactly the situation where silence is worst.
      return NextResponse.json(
        {
          ok: false,
          error: {
            message:
              updated.length > 0
                ? `${updated.length} month(s) were updated, then: ${error.message}`
                : error.message,
          },
        },
        { status: 400 },
      );
    }
    updated.push(id);
  }

  return NextResponse.json({ ok: true, data: { updated } });
}
