import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  executePartialLeadRetention,
} from "@/lib/server/partial-lead-retention";

export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("Retention job is not configured.", 503);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorized.", 401);
  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  const supabase = getSupabaseAdmin();
  try {
    const data = await executePartialLeadRetention(async (args) => {
      const result = await supabase.rpc("run_partial_lead_retention", args);
      return { data: result.data, error: result.error ? { message: result.error.message } : null };
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown retention error.";
    return fail(`Incomplete-form retention failed: ${message}`, 500);
  }
}
