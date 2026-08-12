import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { STATUS_LABEL } from "@/lib/format";
import { LEAD_VIEWED, VIEW_DEDUPE_MINUTES } from "@/lib/admin/lead-events";

type DbLeadEvent = {
  id: string;
  type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function messageFor(ev: DbLeadEvent): string {
  const meta = ev.meta ?? {};
  switch (ev.type) {
    case "lead_created":
      return "Lead submitted via website valuation form.";
    case "status_change": {
      // STATUS_LABEL is the single source of these names. This route used to
      // keep its own copy, which had gone stale: it still said "Closed" and had
      // never learned inspection_scheduled, inspected, negotiating or deal, so
      // the timeline printed raw database values for most of the pipeline.
      const from = STATUS_LABEL[String(meta.from)] ?? String(meta.from ?? "");
      const to = STATUS_LABEL[String(meta.to)] ?? String(meta.to ?? "");
      return `Status changed: ${from} → ${to}`;
    }
    case "value_updated":
      return meta.value != null
        ? `Estimated value set to AED ${Number(meta.value).toLocaleString()}.`
        : "Estimated value cleared.";
    case "note_updated":
      return "Notes updated.";
    case "car_purchased":
      // Written by the deal path in PATCH /api/leads/[id] but never given a
      // sentence here, so the timeline printed the literal string
      // "car_purchased" — on the single most important event in the pipeline.
      return meta.purchase_price_aed != null
        ? `Car bought for AED ${Number(meta.purchase_price_aed).toLocaleString()} and added to Inventory.`
        : "Car added to Inventory.";
    case "marked_spam":
      return meta.is_spam === false ? "Unmarked as spam." : "Marked as spam.";
    default:
      return ev.type;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("lead_events")
    .select("id, type, meta, created_at")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const rows = (data ?? []) as DbLeadEvent[];

  // Views are summarised, not listed. A lead opened forty times would otherwise
  // push every real action — the status changes and the notes, the things
  // someone actually needs to see — off the bottom of the card. The count and
  // the most recent timestamp answer "has anyone looked at this, and when"
  // without burying "what was done".
  const viewRows = rows.filter((ev) => ev.type === LEAD_VIEWED);
  const timeline = rows.filter((ev) => ev.type !== LEAD_VIEWED);

  return NextResponse.json({
    ok: true,
    data: {
      events: timeline.map((ev) => ({
        id: ev.id,
        type: ev.type,
        message: messageFor(ev),
        createdAt: ev.created_at,
      })),
      views: {
        count: viewRows.length,
        // rows are newest-first, so the head is the most recent view.
        lastAt: viewRows[0]?.created_at ?? null,
      },
    },
  });
}

/**
 * Records that an admin opened this lead.
 *
 * Deliberately deduped: without it, one person refreshing, switching tabs, or
 * navigating back and forth would inflate the count into meaninglessness. A
 * repeat inside the window is dropped, so "viewed 6 times" means six separate
 * occasions rather than six re-renders.
 *
 * Failure is intentionally quiet at the caller — the timeline is a record, not
 * the page's purpose, and a lead must still open if this write fails.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - VIEW_DEDUPE_MINUTES * 60 * 1000).toISOString();

  const { data: recent, error: recentError } = await supabase
    .from("lead_events")
    .select("id")
    .eq("lead_id", params.id)
    .eq("type", LEAD_VIEWED)
    .gte("created_at", since)
    .limit(1);

  if (recentError) {
    return NextResponse.json({ ok: false, error: { message: recentError.message } }, { status: 500 });
  }

  if (recent && recent.length > 0) {
    return NextResponse.json({ ok: true, data: { recorded: false } });
  }

  const { error } = await supabase.from("lead_events").insert({
    lead_id: params.id,
    type: LEAD_VIEWED,
    meta: {},
  });

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { recorded: true } });
}
