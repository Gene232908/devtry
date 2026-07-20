import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

type DbLeadEvent = {
  id: string;
  type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  pending: "Pending",
  contacted: "Contacted",
  valuation_sent: "Valuation Sent",
  closed: "Closed",
};

function messageFor(ev: DbLeadEvent): string {
  const meta = ev.meta ?? {};
  switch (ev.type) {
    case "lead_created":
      return "Lead submitted via website valuation form.";
    case "status_change": {
      const from = STATUS_LABEL[String(meta.from)] ?? String(meta.from ?? "");
      const to = STATUS_LABEL[String(meta.to)] ?? String(meta.to ?? "");
      return `Status changed: ${from} → ${to}`;
    }
    case "value_updated":
      return meta.value != null ? `Estimated value set to AED ${Number(meta.value).toLocaleString()}.` : "Estimated value cleared.";
    case "note_updated":
      return "Notes updated.";
    case "marked_spam":
      return "Marked as spam.";
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

  const events = (data as DbLeadEvent[]).map((ev) => ({
    id: ev.id,
    type: ev.type,
    message: messageFor(ev),
    createdAt: ev.created_at,
  }));

  return NextResponse.json({ ok: true, data: { events } });
}
