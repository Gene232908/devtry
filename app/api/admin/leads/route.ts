import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbLead } from "@/lib/admin/lead-mapper";
import { requireStaff } from "@/lib/server/require-staff";
import { selectProjection } from "@/lib/server/staff-projections";
import { PURCHASER_VISIBLE_STATUSES } from "@/lib/auth/lead-visibility";

// Always run at request time (never prerender/cache): admin data must be live.
export const dynamic = "force-dynamic";

/**
 * Safety cap on how many leads one request will return.
 *
 * This query had no limit at all (KNOWN_ISSUES ISSUE-003), so every visit to
 * any admin screen pulled the entire table — the whole thing is loaded once by
 * LeadsProvider and paged through in the browser. That is fine at today's
 * volume and gets steadily worse as leads accumulate.
 *
 * The cap is set high enough to change nothing about how the dashboard behaves
 * now, while making sure a single request can never grow without bound. It is
 * not a substitute for real server-side pagination, which is still the correct
 * fix and needs the leads table reworked to page against the server rather than
 * in memory. Until then `truncated` says plainly when the ceiling was hit,
 * rather than letting the list quietly stop being the whole picture.
 */
const MAX_LEADS = 1000;

export async function GET() {
  // Middleware verifies authentication; this check additionally confirms an
  // active profile and resolves role capabilities for projection.
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const fieldsWithSchedule =
    "id, created_at, full_name, phone_e164, email, make, model, trim, year, mileage_km, condition, option_level, description, emirate, status, estimated_value_aed, notes, is_duplicate, is_spam, call_center_id, purchaser_id, inspection_scheduled_at";
  const fieldsFallback =
    "id, created_at, full_name, phone_e164, email, make, model, trim, year, mileage_km, condition, option_level, description, emirate, status, estimated_value_aed, notes, is_duplicate, is_spam, call_center_id, purchaser_id";

  const fetchLeads = async (fields: string) => {
    let q = getSupabaseAdmin().from("leads").select(fields);

    // Row scoping is enforced HERE, not in the browser. An operational role must
    // never receive a lead it is not allowed to see, because "not rendered" and
    // "not sent" are different guarantees — the first one is defeated by opening
    // devtools.
    //
    // Both clauses are strict equality on purpose. They used to be `.or()` with
    // an `is.null` arm, which handed every unassigned lead to every agent, and
    // the purchaser arm additionally OR'd in `status.in.(...)` — so any purchaser
    // could read every scheduled lead in the company regardless of who it was
    // assigned to. An unassigned lead now belongs to nobody but the owner.
    if (auth.identity.role === "call_center") {
      q = q.eq("call_center_id", auth.identity.userId);
    } else if (auth.identity.role === "purchaser") {
      // A purchaser sees their own leads only once the agent has handed them
      // over; the earlier stages are the agent's work and are none of theirs.
      q = q
        .eq("purchaser_id", auth.identity.userId)
        .in("status", PURCHASER_VISIBLE_STATUSES);
    }

    return q.order("created_at", { ascending: false }).limit(MAX_LEADS);
  };

  let { data, error } = await fetchLeads(fieldsWithSchedule);

  if (error && error.message?.includes("inspection_scheduled_at")) {
    console.warn("[GET /api/admin/leads] inspection_scheduled_at column missing on live database, retrying with fallback fields...");
    const fallback = await fetchLeads(fieldsFallback);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("[GET /api/admin/leads] Database query error:", error);
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const project = selectProjection(auth.identity);
  const leads = ((data ?? []) as unknown as DbLead[]).map((row) => project(row));
  const truncated = leads.length === MAX_LEADS;

  if (truncated) {
    console.warn(
      `[admin/leads] hit the ${MAX_LEADS}-row cap — the dashboard is no longer showing every lead. Server-side pagination is now required (KNOWN_ISSUES ISSUE-003).`,
    );
  }

  return NextResponse.json({ ok: true, data: { leads, truncated } });
}
