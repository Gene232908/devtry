import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { isCarriedForward, mapDbStatement, monthsToBuild, nextMonth, type DbStatement } from "@/lib/admin/commission";

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

  // Sequential and oldest-first on purpose: each call locks its statement row,
  // and the ordering matters now that unbilled entries carry forward — the
  // earliest OPEN month must get first claim on them.
  for (const month of months) {
    const { error } = await supabase.rpc("build_commission_statement", { p_month: month });
    if (error) {
      return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
    }
  }

  // Every month up to today may already be settled — which leaves a sale made
  // after its month was paid with nowhere to go. Open the following month so
  // the money always has a home.
  //
  // Stops the moment an attempt fails to claim anything. Without that guard,
  // a database still running the pre-0017 function (which only accepts sales
  // made inside its own month) would never adopt the straggler, and this would
  // create an empty statement on every single page load.
  let landing = months[months.length - 1];
  let previousOrphans = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { count } = await supabase
      .from("commission_entries")
      .select("id", { count: "exact", head: true })
      .is("statement_id", null);

    const orphans = count ?? 0;
    if (orphans === 0) break;

    if (orphans >= previousOrphans) {
      // The last attempt changed nothing, so another will not either.
      console.warn(
        `[admin/commission] ${orphans} commission entr${orphans === 1 ? "y is" : "ies are"} unbilled and could not be carried forward. ` +
          `This means migration 0017_commission_carry_forward.sql has not been applied — until it is, sales made after their own month was settled stay invisible.`,
      );
      break;
    }

    previousOrphans = orphans;
    landing = nextMonth(landing);
    const { error } = await supabase.rpc("build_commission_statement", { p_month: landing });
    if (error) {
      return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
    }
  }

  const [{ data, error }, { data: entryRows }] = await Promise.all([
    supabase.from("commission_statements").select(SELECT).order("period_month", { ascending: false }),
    supabase.from("commission_entries").select("statement_id, sold_at").not("statement_id", "is", null),
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  // How many of each statement's sales happened in an earlier month, so the UI
  // can say why a month bills more cars than were sold in it.
  const carried = new Map<string, number>();
  const byMonth = new Map((((data ?? []) as unknown as DbStatement[])).map((s) => [s.id, s.period_month]));
  for (const row of (entryRows ?? []) as { statement_id: string; sold_at: string }[]) {
    const month = byMonth.get(row.statement_id);
    if (month && isCarriedForward(row.sold_at, month)) {
      carried.set(row.statement_id, (carried.get(row.statement_id) ?? 0) + 1);
    }
  }

  const statements = ((data ?? []) as unknown as DbStatement[]).map((r) =>
    mapDbStatement(r, carried.get(r.id) ?? 0),
  );

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
