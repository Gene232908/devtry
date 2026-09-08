import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getNextRoundRobinAssignee, type StaffMemberForRoundRobin } from "@/lib/admin/round-robin";

/**
 * lib/server/lead-assignment.ts
 *
 * Server-side round-robin assignment. This is the ONLY place that decides who a
 * lead belongs to.
 *
 * It used to be decided in the browser: LeadsProvider ran the rotation over a
 * hardcoded list of demo staff ids ("agent-1", "purchaser-1") and overwrote
 * whatever the database actually said. That made assignment a rendering detail
 * — every client computed its own answer, the answer disagreed with the row,
 * and nothing was ever written back. Ownership has to be a fact stored on the
 * lead, because it is what the visibility rules are enforced against.
 *
 * Rotation position is derived from how many leads already carry an assignee
 * for that role, so the sequence survives restarts and is not held in memory:
 *   0 leads assigned -> oldest active account
 *   1 lead  assigned -> 2nd oldest
 *   N leads assigned -> account (N mod count), wrapping forever.
 *
 * Concurrency: two leads arriving in the same instant can read the same count
 * and land on the same person. The rotation self-corrects on the next lead and
 * the owner can reassign by hand, so this is deliberately not worth a lock.
 */

type Role = "call_center" | "purchaser";

/** Active accounts for a role, oldest created first — the rotation order. */
export async function loadActiveStaff(role: Role): Promise<StaffMemberForRoundRobin[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, role, is_active, created_at")
    .eq("role", role)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id as string,
    role: p.role as Role,
    createdAt: (p.created_at as string) ?? null,
    isActive: p.is_active !== false,
  }));
}

/** How many leads already hold an assignee for this role — the rotation cursor. */
async function assignedLeadCount(column: "call_center_id" | "purchaser_id"): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .not(column, "is", null);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Picks the next account in rotation for `role`, or null when nobody is active.
 *
 * Never throws. Assignment is an optimisation on top of the lead, not a
 * precondition for it: a valuation the customer just submitted must not be lost
 * because no agent account exists or the profiles query failed. An unassigned
 * lead is still visible to the owner, who can assign it by hand.
 */
export async function pickNextAssignee(role: Role): Promise<string | null> {
  try {
    const staff = await loadActiveStaff(role);
    if (staff.length === 0) return null;

    const column = role === "call_center" ? "call_center_id" : "purchaser_id";
    const position = await assignedLeadCount(column);

    return getNextRoundRobinAssignee(staff, role, position)?.id ?? null;
  } catch (e) {
    console.error(`[lead-assignment] could not pick next ${role}:`, e);
    return null;
  }
}
