import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { startOfUaeDayUtc } from "@/lib/uae-time";

// Always run at request time (never prerender/cache): admin stats must be live.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  // "Today" means the UAE calendar day, not the server's (likely UTC) local day -
  // the server may run anywhere (e.g. Vercel defaults to UTC), but the business is UAE-based.
  const startOfToday = startOfUaeDayUtc();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, today, active, visitors, whatsapp, incomplete] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()),
    // "Active" = still being worked. Excludes 'new' (nobody has picked it up),
    // 'deal' (bought — it is a car in Inventory now) and 'closed' (finished).
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "contacted", "inspection_scheduled", "inspected", "negotiating"]),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("type", "page_view").gte("created_at", weekAgo),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("type", "whatsapp_click"),
    // Abandoned forms still waiting on someone. Converted rows are excluded, so
    // this only ever counts people who are not already leads.
    supabase.from("partial_leads").select("id", { count: "exact", head: true }).is("converted_lead_id", null),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      totalLeads: total.count ?? 0,
      newToday: today.count ?? 0,
      activeLeads: active.count ?? 0,
      visitorsThisWeek: visitors.count ?? 0,
      whatsappClicks: whatsapp.count ?? 0,
      incompleteForms: incomplete.count ?? 0,
    },
  });
}
