import { NextRequest, NextResponse } from "next/server";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { requireStaff } from "@/lib/server/require-staff";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ExpenseRow = {
  id: string;
  description: string;
  amount_aed: number | string;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type ProfileRow = { id: string; display_name: string | null; role: string };

async function canAccessInventory(inventoryId: string, userId: string, role: string) {
  if (role === "admin" || role === "manager") return true;
  const { data } = await getSupabaseAdmin()
    .from("inventory")
    .select("leads ( call_center_id, purchaser_id )")
    .eq("id", inventoryId)
    .maybeSingle();
  const lead = Array.isArray(data?.leads) ? data.leads[0] : data?.leads;
  return role === "call_center"
    ? lead?.call_center_id === userId
    : role === "purchaser" && lead?.purchaser_id === userId;
}

async function authorize(inventoryId: string) {
  const auth = await requireStaff();
  if (!auth.ok) return { response: NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status }) };
  if (!isSupabaseConfigured()) return { response: NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 }) };
  if (!await canAccessInventory(inventoryId, auth.identity.userId, auth.identity.role)) {
    return { response: NextResponse.json({ ok: false, error: { message: "Not authorized." } }, { status: 403 }) };
  }
  return { identity: auth.identity };
}

async function recordExpenseActivity(
  inventoryId: string,
  actor: { userId: string; displayName: string; role: string },
  type: "expense_added" | "expense_deleted",
  meta: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();
  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("lead_id")
    .eq("id", inventoryId)
    .maybeSingle();
  if (inventoryError || !inventory?.lead_id) throw new Error(inventoryError?.message ?? "Inventory lead not found.");
  const { error } = await supabase.from("lead_events").insert({
    lead_id: inventory.lead_id,
    actor: actor.userId,
    type,
    meta: { ...meta, actor_name: actor.displayName, actor_role: actor.role },
  });
  if (error) throw new Error(error.message);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await authorize(params.id);
  if ("response" in gate) return gate.response;
  const { data, error } = await getSupabaseAdmin()
    .from("inventory_expenses")
    .select("id, description, amount_aed, created_by, created_at, updated_at")
    .eq("inventory_id", params.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  const rows = (data ?? []) as ExpenseRow[];
  const actorIds = Array.from(new Set(rows.map((row) => row.created_by)));
  const { data: profiles, error: profileError } = actorIds.length
    ? await getSupabaseAdmin().from("profiles").select("id, display_name, role").in("id", actorIds)
    : { data: [], error: null };
  if (profileError) return NextResponse.json({ ok: false, error: { message: profileError.message } }, { status: 500 });
  const profileById = new Map((profiles ?? [] as ProfileRow[]).map((profile) => [profile.id, profile as ProfileRow]));
  const expenses = rows.map((row) => ({
    id: row.id, description: row.description, amountAed: Number(row.amount_aed), createdBy: row.created_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
    createdByName: profileById.get(row.created_by)?.display_name ?? "Staff member",
    createdByRole: profileById.get(row.created_by)?.role ?? null,
  }));
  return NextResponse.json({ ok: true, data: { expenses } });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await authorize(params.id);
  if ("response" in gate) return gate.response;
  const blocked = blockedByPreview();
  if (blocked) return blocked;
  let body: { description?: unknown; amountAed?: unknown; expenseId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 }); }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const amount = Number(body.amountAed);
  const expenseId = typeof body.expenseId === "string" && body.expenseId.trim() ? body.expenseId : null;
  if (!description || description.length > 240 || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: { message: "Enter a short description and a valid AED amount." } }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin().rpc("upsert_inventory_expense", {
    p_inventory_id: params.id, p_expense_id: expenseId, p_description: description, p_amount_aed: amount, p_actor_id: gate.identity.userId,
  });
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
  const row = Array.isArray(data) ? data[0] : data;
  try {
    await recordExpenseActivity(params.id, gate.identity, "expense_added", {
      description,
      amount_aed: amount,
      action: expenseId ? "updated" : "added",
    });
  } catch (activityError) {
    return NextResponse.json({ ok: false, error: { message: activityError instanceof Error ? activityError.message : "Couldn't record expense activity." } }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: { id: row?.id } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await authorize(params.id);
  if ("response" in gate) return gate.response;
  const blocked = blockedByPreview();
  if (blocked) return blocked;
  const expenseId = req.nextUrl.searchParams.get("expenseId");
  if (!expenseId) return NextResponse.json({ ok: false, error: { message: "Choose an expense to remove." } }, { status: 400 });
  const { data: expense, error: expenseReadError } = await getSupabaseAdmin()
    .from("inventory_expenses")
    .select("description, amount_aed")
    .eq("id", expenseId)
    .eq("inventory_id", params.id)
    .maybeSingle();
  if (expenseReadError || !expense) return NextResponse.json({ ok: false, error: { message: expenseReadError?.message ?? "Expense not found." } }, { status: 404 });
  const { error } = await getSupabaseAdmin().rpc("delete_inventory_expense", { p_inventory_id: params.id, p_expense_id: expenseId });
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
  try {
    await recordExpenseActivity(params.id, gate.identity, "expense_deleted", {
      description: expense.description,
      amount_aed: Number(expense.amount_aed),
    });
  } catch (activityError) {
    return NextResponse.json({ ok: false, error: { message: activityError instanceof Error ? activityError.message : "Couldn't record expense activity." } }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
