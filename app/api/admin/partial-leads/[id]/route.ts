import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { PARTIAL_LEAD_COLUMNS, PARTIAL_STATUSES_ALLOWED } from "@/lib/admin/partial-lead";
import { blockedByPreview } from "@/lib/admin/preview-guard";

// Admin-only (gated by middleware.ts for /api/admin/*). Single incomplete
// valuation form: read it, record follow-up on it, or delete it.

export const dynamic = "force-dynamic";

// Mirrors the CHECK constraint on partial_leads.status.
const ALLOWED_STATUSES = new Set<string>(PARTIAL_STATUSES_ALLOWED);

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  const { data, error } = await getSupabaseAdmin()
    .from("partial_leads")
    .select(PARTIAL_LEAD_COLUMNS)
    .eq("id", params.id)
    // Converted rows are no longer incomplete — that person is a real lead now,
    // so their detail page lives under Leads instead.
    .is("converted_lead_id", null)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Not found.", 404);

  return NextResponse.json({ ok: true, data: { partialLead: data } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  let body: { status?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) {
      return fail("Invalid status.", 400);
    }
    update.status = body.status;
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") return fail("Invalid notes.", 400);
    update.notes = body.notes;
  }

  const { error } = await getSupabaseAdmin().from("partial_leads").update(update).eq("id", params.id);
  if (error) return fail(error.message, 500);

  return NextResponse.json({ ok: true, data: { id: params.id } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  const { error } = await getSupabaseAdmin().from("partial_leads").delete().eq("id", params.id);
  if (error) return fail(error.message, 500);

  return NextResponse.json({ ok: true, data: { id: params.id } });
}
