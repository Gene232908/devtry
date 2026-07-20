import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/server/ip";

const ALLOWED_TYPES = new Set(["page_view", "whatsapp_click"]);

export async function POST(req: NextRequest) {
  // Always succeed silently for the client; analytics must never disrupt UX.
  if (!isSupabaseConfigured()) return new NextResponse(null, { status: 204 });

  let body: { type?: unknown; path?: unknown; sessionId?: unknown; meta?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const type = typeof body.type === "string" ? body.type : "";
  if (!ALLOWED_TYPES.has(type)) return new NextResponse(null, { status: 204 });

  const ip = getClientIp(req);

  // Coarse per-IP flood guard (300 events / 10 min).
  if (isRateLimited(`events:${ip ?? "unknown"}`, 300, 10 * 60 * 1000)) {
    return new NextResponse(null, { status: 204 });
  }

  const path = typeof body.path === "string" ? body.path.slice(0, 512) : null;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};

  try {
    await getSupabaseAdmin().from("events").insert({
      type,
      path,
      session_id: sessionId,
      meta,
    });
  } catch {
    // swallow — analytics is best-effort
  }

  return new NextResponse(null, { status: 204 });
}
