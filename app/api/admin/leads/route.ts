import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mapDbLead, type DbLead } from "@/lib/admin/lead-mapper";

// Always run at request time (never prerender/cache): admin data must be live.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leads")
    .select(
      "id, created_at, full_name, phone_e164, email, make, model, trim, year, mileage_km, condition, option_level, description, emirate, status, estimated_value_aed, notes, is_duplicate, is_spam",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const leads = (data as DbLead[]).map(mapDbLead);
  return NextResponse.json({ ok: true, data: { leads } });
}
