import { canSeeLead } from "@/lib/auth/lead-visibility";
import { hasCapability, type StaffIdentity } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/server/require-staff";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export type InspectionLead = {
  id: string;
  status: string;
  purchaser_id: string | null;
  call_center_id: string | null;
  full_name: string;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileage_km: number | null;
  specification: string | null;
  arrival_status?: "not_arrived" | "arrived";
};

export async function authorizeInspectionLead(id: string, mode: "read" | "write") {
  if (!isSupabaseConfigured()) return { ok: false as const, status: 503, message: "Database is not configured." };
  const auth = await requireStaff();
  if (!auth.ok) return { ok: false as const, status: auth.status, message: auth.message };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select("id, status, purchaser_id, call_center_id, full_name, make, model, trim, year, mileage_km, specification, arrival_status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false as const, status: 404, message: "Lead not found." };

  const lead = data as InspectionLead;
  const owner = hasCapability(auth.identity, "viewAllLeads");
  const visible = owner || canSeeLead({ status: lead.status, callCenterId: lead.call_center_id, purchaserId: lead.purchaser_id }, auth.identity.role, auth.identity.userId);
  if (!visible) return { ok: false as const, status: 404, message: "Lead not found." };

  // Completed inspection reports are tracking records for Purchasers and
  // owner-level staff only. Keep this server-side because the UI link is not
  // an authorization boundary.
  if (mode === "read" && !owner && auth.identity.role !== "purchaser") {
    return { ok: false as const, status: 404, message: "Lead not found." };
  }

  if (mode === "write" && !owner && auth.identity.role !== "purchaser") {
    return { ok: false as const, status: 403, message: "Only the assigned Purchaser or Super Admin can edit this inspection." };
  }
  if (mode === "write" && !owner && lead.purchaser_id !== auth.identity.userId) {
    return { ok: false as const, status: 403, message: "This inspection is assigned to another Purchaser." };
  }
  if (mode === "write" && !["inspection_scheduled", "inspected", "negotiating", "deal"].includes(lead.status)) {
    return { ok: false as const, status: 409, message: "This lead is not available for inspection." };
  }
  if (mode === "write" && lead.status === "inspection_scheduled" && lead.arrival_status !== "arrived") {
    return { ok: false as const, status: 409, message: "Confirm customer arrival before starting the inspection." };
  }
  return { ok: true as const, auth: auth.identity as StaffIdentity, supabase, lead };
}
