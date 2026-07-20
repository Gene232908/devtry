import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

const STATUSES = new Set(["new", "pending", "contacted", "valuation_sent", "closed"]);

type LeadEventInsert = { lead_id: string; type: string; meta: Record<string, unknown> };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const id = params.id;
  let body: { status?: unknown; estimated_value_aed?: unknown; notes?: unknown; is_spam?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Load the current row so we can record meaningful timeline diffs.
  const { data: current, error: loadError } = await supabase
    .from("leads")
    .select("id, status, estimated_value_aed, notes, is_spam")
    .eq("id", id)
    .single();

  if (loadError || !current) {
    return NextResponse.json({ ok: false, error: { message: "Lead not found." } }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  const events: LeadEventInsert[] = [];

  if (typeof body.status === "string") {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ ok: false, error: { message: "Invalid status." } }, { status: 400 });
    }
    if (body.status !== current.status) {
      update.status = body.status;
      events.push({ lead_id: id, type: "status_change", meta: { from: current.status, to: body.status } });
    }
  }

  if ("estimated_value_aed" in body) {
    const raw = body.estimated_value_aed;
    const value = raw === null || raw === "" ? null : Number(raw);
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ ok: false, error: { message: "Invalid value." } }, { status: 400 });
    }
    update.estimated_value_aed = value;
    events.push({ lead_id: id, type: "value_updated", meta: { value } });
  }

  if (typeof body.notes === "string" && body.notes !== (current.notes ?? "")) {
    update.notes = body.notes;
    events.push({ lead_id: id, type: "note_updated", meta: {} });
  }

  if (typeof body.is_spam === "boolean" && body.is_spam !== current.is_spam) {
    update.is_spam = body.is_spam;
    events.push({ lead_id: id, type: "marked_spam", meta: { is_spam: body.is_spam } });
    if (body.is_spam && current.status !== "closed") {
      update.status = "closed";
      events.push({ lead_id: id, type: "status_change", meta: { from: current.status, to: "closed" } });
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, data: { id, unchanged: true } });
  }

  const { error: updateError } = await supabase.from("leads").update(update).eq("id", id);
  if (updateError) {
    return NextResponse.json({ ok: false, error: { message: updateError.message } }, { status: 500 });
  }

  if (events.length > 0) {
    try {
      await supabase.from("lead_events").insert(events);
    } catch {
      // non-fatal: the update itself succeeded
    }
  }

  return NextResponse.json({ ok: true, data: { id } });
}
