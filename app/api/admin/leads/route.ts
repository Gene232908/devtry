import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mapDbLead, type DbLead } from "@/lib/admin/lead-mapper";

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
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leads")
    .select(
      "id, created_at, full_name, phone_e164, email, make, model, trim, year, mileage_km, condition, option_level, description, emirate, status, estimated_value_aed, notes, is_duplicate, is_spam",
    )
    .order("created_at", { ascending: false })
    .limit(MAX_LEADS);

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const leads = (data as DbLead[]).map(mapDbLead);
  const truncated = leads.length === MAX_LEADS;

  if (truncated) {
    console.warn(
      `[admin/leads] hit the ${MAX_LEADS}-row cap — the dashboard is no longer showing every lead. Server-side pagination is now required (KNOWN_ISSUES ISSUE-003).`,
    );
  }

  return NextResponse.json({ ok: true, data: { leads, truncated } });
}
