import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { mapDbStatement, monthsToBuild, type DbStatement } from "@/lib/admin/commission";

export const dynamic = "force-dynamic";

const SELECT = `
  id, period_month, entry_count, total_profit_aed, total_commission_aed,
  status, issued_at, paid_at, payment_note
`;

/**
 * GET — every monthly statement, rebuilding the open ones first.
 *
 * Rebuilding on read keeps the current month's total live as cars sell, without
 * a scheduled job. build_commission_statement() ignores anything already issued
 * or paid, so this can never disturb a settled month.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();

  // Only months from the first sale onwards can hold anything.
  const { data: earliest } = await supabase
    .from("commission_entries")
    .select("sold_at")
    .order("sold_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const months = monthsToBuild(earliest?.sold_at ?? null);

  // Sequential on purpose: each call locks its statement row, and firing them
  // together buys contention for no real gain at this volume.
  for (const month of months) {
    const { error } = await supabase.rpc("build_commission_statement", { p_month: month });
    if (error) {
      return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("commission_statements")
    .select(SELECT)
    .order("period_month", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const statements = ((data ?? []) as unknown as DbStatement[]).map(mapDbStatement);

  // A month with no sales has nothing to bill and only adds noise.
  return NextResponse.json({ ok: true, data: { statements: statements.filter((s) => s.entryCount > 0) } });
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
