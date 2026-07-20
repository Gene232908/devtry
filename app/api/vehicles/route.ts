import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

// Public, unauthenticated read endpoint — the valuation form needs the make/model
// catalog before a visitor has done anything (no session, no OTP yet). Not sensitive
// data, so no auth gate. Writes only happen via the /api/admin/catalog/* routes.
export const dynamic = "force-dynamic";

type DbMake = { id: string; name: string; display_order: number };
type DbModel = { id: string; make_id: string; name: string; display_order: number };

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const [makesRes, modelsRes] = await Promise.all([
    supabase.from("car_makes").select("id, name, display_order").order("display_order").order("name"),
    supabase.from("car_models").select("id, make_id, name, display_order").order("display_order").order("name"),
  ]);

  if (makesRes.error) {
    return NextResponse.json({ ok: false, error: { message: makesRes.error.message } }, { status: 500 });
  }
  if (modelsRes.error) {
    return NextResponse.json({ ok: false, error: { message: modelsRes.error.message } }, { status: 500 });
  }

  const makes = (makesRes.data ?? []) as DbMake[];
  const models = (modelsRes.data ?? []) as DbModel[];

  const data = makes.map((make) => ({
    id: make.id,
    name: make.name,
    models: models.filter((model) => model.make_id === make.id).map((model) => ({ id: model.id, name: model.name })),
  }));

  return NextResponse.json({ ok: true, data: { makes: data } });
}
