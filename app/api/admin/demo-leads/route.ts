import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { MAKES } from "@/config/vehicles";
import { AREAS_BY_EMIRATE } from "@/config/emirates-areas";

export const dynamic = "force-dynamic";

const DEMO_SOURCE = "demonstration";
const DEMO_NAME = "CarVibe Demo Lead";

const STATUSES = [
  "new",
  "pending",
  "contacted",
  "inspection_scheduled",
  "inspected",
  "negotiating",
  "deal",
  "closed",
] as const;

const CARS = MAKES.map((make) => [make.name, make.models[0], "Standard"] as const);
const EMIRATES = Object.keys(AREAS_BY_EMIRATE);
const DEMO_TOTAL = STATUSES.length * CARS.length * EMIRATES.length;

function demoRows() {
  const now = Date.now();
  return STATUSES.flatMap((status, statusIndex) =>
    CARS.flatMap(([make, model, trim], carIndex) =>
      EMIRATES.map((emirate, emirateIndex) => {
        const n = statusIndex * CARS.length * EMIRATES.length + carIndex * EMIRATES.length + emirateIndex + 1;
        return {
          full_name: `${DEMO_NAME} ${String(n).padStart(3, "0")}`,
          phone_e164: `+9715550${String(n).padStart(5, "0")}`,
          email: `demo.lead.${String(n).padStart(3, "0")}@example.invalid`,
          make,
          model,
          trim,
          year: 2020 + (carIndex % 5),
          mileage_km: 15000 + n * 1250,
          condition: carIndex % 3 === 0 ? "excellent" : carIndex % 3 === 1 ? "good" : "fair",
          option_level: carIndex % 3 === 0 ? "Full Option" : carIndex % 3 === 1 ? "Mid Mode" : "Basic Mode",
          description: "Demonstration record only. Not a real customer.",
          emirate,
          status,
          estimated_value_aed: 85000 + n * 2500,
          notes: `DEMO-ONLY / ${status} / ${make} / ${emirate}`,
          source: DEMO_SOURCE,
          is_duplicate: false,
          is_spam: false,
          created_at: new Date(now - n * 60 * 60 * 1000).toISOString(),
        };
      }),
    ),
  );
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const { data: run, error } = await supabase
    .from("demo_lead_runs")
    .select("status, lead_count")
    .eq("id", true)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });

  return NextResponse.json({
    ok: true,
    data: { status: run?.status === "active" ? "active" : "available", leadCount: run?.lead_count ?? 0 },
  });
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("demo_lead_runs")
    .select("status")
    .eq("id", true)
    .maybeSingle();
  if (readError) return NextResponse.json({ ok: false, error: { message: readError.message } }, { status: 500 });
  const rows = demoRows();
  const { count: existingCount, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("source", DEMO_SOURCE);
  if (countError) return NextResponse.json({ ok: false, error: { message: countError.message } }, { status: 500 });
  const currentCount = existingCount ?? 0;
  if (currentCount >= DEMO_TOTAL) {
    return NextResponse.json({ ok: false, error: { message: "The demonstration leads have already been created." } }, { status: 409 });
  }

  const { error: insertError } = await supabase.from("leads").insert(rows.slice(currentCount));
  if (insertError) return NextResponse.json({ ok: false, error: { message: insertError.message } }, { status: 500 });

  const { error: runError } = existing
    ? await supabase.from("demo_lead_runs").update({ status: "active", lead_count: DEMO_TOTAL, deleted_at: null }).eq("id", true)
    : await supabase.from("demo_lead_runs").insert({ id: true, status: "active", lead_count: DEMO_TOTAL });
  if (runError) {
    await supabase.from("leads").delete().eq("source", DEMO_SOURCE);
    return NextResponse.json({ ok: false, error: { message: runError.message } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { leadCount: DEMO_TOTAL } });
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const { data: run, error: readError } = await supabase
    .from("demo_lead_runs")
    .select("status")
    .eq("id", true)
    .maybeSingle();
  if (readError) return NextResponse.json({ ok: false, error: { message: readError.message } }, { status: 500 });
  if (!run || run.status !== "active") {
    return NextResponse.json({ ok: false, error: { message: "There is no active demonstration batch to delete." } }, { status: 409 });
  }

  const { error: deleteError } = await supabase.rpc("reset_demo_leads");
  if (deleteError) return NextResponse.json({ ok: false, error: { message: deleteError.message } }, { status: 500 });

  return NextResponse.json({ ok: true, data: { deleted: true } });
}
