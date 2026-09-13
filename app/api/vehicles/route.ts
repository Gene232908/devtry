import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

// Public, unauthenticated read endpoint — the valuation form needs the
// make/model/trim catalog before a visitor has done anything (no session, no OTP
// yet). Not sensitive data, so no auth gate. Writes only happen via the
// /api/admin/catalog/* routes.
export const dynamic = "force-dynamic";

type DbMake = { id: string; name: string; display_order: number };
type DbModel = { id: string; make_id: string; name: string; display_order: number };
type DbTrim = { id: string; model_id: string; name: string; display_order: number };
type DbSpecification = { id: string; name: string; display_order: number };

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const [makesRes, modelsRes, trimsRes, specificationsRes] = await Promise.all([
    supabase.from("car_makes").select("id, name, display_order").order("display_order").order("name"),
    supabase.from("car_models").select("id, make_id, name, display_order").order("display_order").order("name"),
    supabase.from("car_trims").select("id, model_id, name, display_order").order("display_order").order("name"),
    supabase.from("vehicle_specifications").select("id, name, display_order").order("display_order").order("name"),
  ]);

  if (makesRes.error) {
    return NextResponse.json({ ok: false, error: { message: makesRes.error.message } }, { status: 500 });
  }
  if (modelsRes.error) {
    return NextResponse.json({ ok: false, error: { message: modelsRes.error.message } }, { status: 500 });
  }
  if (trimsRes.error) {
    return NextResponse.json({ ok: false, error: { message: trimsRes.error.message } }, { status: 500 });
  }

  const makes = (makesRes.data ?? []) as DbMake[];
  const models = (modelsRes.data ?? []) as DbModel[];
  const trims = (trimsRes.data ?? []) as DbTrim[];
  // Specifications were introduced after the original catalog. If a local
  // database has not applied the additive migration yet, preserve the live
  // Make/Model/Trim payload and let the client use its clearly marked fallback.
  const specifications = specificationsRes.error ? [] : (specificationsRes.data ?? []) as DbSpecification[];

  // Nested rather than three flat lists: every consumer needs trims in the
  // context of their model, and the model in the context of its make.
  const data = makes.map((make) => ({
    id: make.id,
    name: make.name,
    models: models
      .filter((model) => model.make_id === make.id)
      .map((model) => ({
        id: model.id,
        name: model.name,
        trims: trims.filter((trim) => trim.model_id === model.id).map((trim) => ({ id: trim.id, name: trim.name })),
      })),
  }));

  return NextResponse.json({ ok: true, data: { makes: data, specifications } });
}
