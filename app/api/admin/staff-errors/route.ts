import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/require-admin";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import {
  BASE_STAFF_ERRORS,
  type StaffErrorRecord,
  type IncidentType,
  type IncidentStatus,
} from "@/lib/admin/staff-errors";
import type { StaffRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

interface DbEventRow {
  id: string;
  lead_id: string;
  actor: string | null;
  type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

interface DbLeadRow {
  id: string;
  full_name: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  arrival_status?: string | null;
}

interface DbProfileRow {
  id: string;
  display_name: string | null;
  role: string | null;
}

export async function GET() {
  // If database is not configured and in local preview mode without DB
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      data: { records: ADMIN_PREVIEW ? BASE_STAFF_ERRORS : [] },
    });
  }

  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: { message: admin.message } },
      { status: admin.status }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Query actual arrival_reverted, arrival_reversal_requested, arrival_reset_due_to_reschedule, arrival_reversal_declined, and staff_error events
    const { data: eventsData, error: eventsError } = await supabase
      .from("lead_events")
      .select("id, lead_id, actor, type, meta, created_at")
      .in("type", [
        "arrival_reverted",
        "arrival_reversal_requested",
        "arrival_reset_due_to_reschedule",
        "arrival_reversal_declined",
        "staff_error",
      ])
      .order("created_at", { ascending: false })
      .limit(150);

    if (eventsError) {
      return NextResponse.json(
        { ok: false, error: { message: eventsError.message } },
        { status: 500 }
      );
    }

    const rawEvents = (eventsData ?? []) as DbEventRow[];

    // If there are no real events in the database, return empty array
    if (rawEvents.length === 0) {
      return NextResponse.json({
        ok: true,
        data: { records: [] },
      });
    }

    const leadIds = Array.from(new Set(rawEvents.map((e) => e.lead_id).filter(Boolean)));

    // Fetch confirmed arrival events for these leads to know which staff member checked in the customer
    const { data: confirmedData } = leadIds.length > 0
      ? await supabase
          .from("lead_events")
          .select("id, lead_id, actor, meta, created_at")
          .eq("type", "arrival_confirmed")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const confirmedEvents = (confirmedData ?? []) as DbEventRow[];

    // Fetch leads early to check arrival_status
    const { data: leadsData } = leadIds.length > 0
      ? await supabase.from("leads").select("id, full_name, make, model, year, arrival_status").in("id", leadIds)
      : { data: [] };

    const leadsMap = new Map(((leadsData as DbLeadRow[]) ?? []).map((l) => [l.id, l]));

    // Filter events: only include arrival_reversal_requested if the lead is currently marked as arrived
    // and hasn't been reverted, rescheduled, or declined afterwards
    const events = rawEvents.filter((ev) => {
      if (ev.type === "arrival_reset_due_to_reschedule") return false; // purely a resolution event
      if (ev.type !== "arrival_reversal_requested") return true;

      const lead = leadsMap.get(ev.lead_id);
      // If arrival status is already not_arrived (e.g. turned off, rescheduled, or reverted),
      // there is no pending reversal to approve!
      if (!lead || lead.arrival_status !== "arrived") return false;

      const isResolved = rawEvents.some(
        (other) =>
          other.lead_id === ev.lead_id &&
          (other.type === "arrival_reverted" ||
            other.type === "arrival_reset_due_to_reschedule" ||
            other.type === "arrival_reversal_declined") &&
          new Date(other.created_at).getTime() >= new Date(ev.created_at).getTime() - 1000
      );
      return !isResolved;
    });

    // Helper: identify the staff member who made the error
    const getErroneousStaffId = (ev: DbEventRow): string => {
      const meta = ev.meta ?? {};
      if (typeof meta.original_arrived_by === "string" && meta.original_arrived_by.trim()) {
        return meta.original_arrived_by.trim();
      }
      if (ev.type === "arrival_reversal_requested") {
        return ev.actor || "staff-unknown";
      }

      // Prioritize confirmed arrival event by call_center staff if any on this lead
      const csrConfirmed = confirmedEvents.find(
        (c) =>
          c.lead_id === ev.lead_id &&
          (c.meta?.actor_role === "call_center" ||
            c.actor === "3b33fe56-6467-4b0f-a021-6464ff42ff6f")
      );
      if (csrConfirmed?.actor) {
        return csrConfirmed.actor;
      }

      // For arrival_reverted, find the arrival_confirmed event on this lead closest in time
      const evTime = new Date(ev.created_at).getTime();
      const matched =
        confirmedEvents.find(
          (c) => c.lead_id === ev.lead_id && new Date(c.created_at).getTime() <= evTime + 2000
        ) || confirmedEvents.find((c) => c.lead_id === ev.lead_id);

      if (matched?.actor) {
        return matched.actor;
      }
      return ev.actor || "staff-unknown";
    };

    // Helper: identify the Super Admin who cleared/approved the reversal
    const getApproverId = (ev: DbEventRow): string | null => {
      const meta = ev.meta ?? {};
      if (typeof meta.reverted_by === "string" && meta.reverted_by.trim()) {
        return meta.reverted_by.trim();
      }
      if (ev.type === "arrival_reverted") {
        return ev.actor;
      }
      return null;
    };

    const staffIds = events.map(getErroneousStaffId).filter((id) => id && id.includes("-"));
    const approverIds = events.map(getApproverId).filter((id): id is string => typeof id === "string" && id.includes("-"));
    const actorIds = events.map((e) => e.actor).filter((id): id is string => typeof id === "string" && id.includes("-"));

    const allProfileIds = Array.from(new Set([...staffIds, ...approverIds, ...actorIds]));

    // Fetch profiles with display_name, role
    const { data: profilesData } = allProfileIds.length > 0
      ? await supabase.from("profiles").select("id, display_name, role").in("id", allProfileIds)
      : { data: [] };

    const profilesMap = new Map(((profilesData as DbProfileRow[]) ?? []).map((p) => [p.id, p]));

    const mappedRecords: StaffErrorRecord[] = events.map((event) => {
      const lead = leadsMap.get(event.lead_id);
      const meta = event.meta ?? {};

      const erroneousStaffId = getErroneousStaffId(event);
      const approverId = getApproverId(event);

      const staffProfile = profilesMap.get(erroneousStaffId);
      const approverProfile = approverId ? profilesMap.get(approverId) : null;

      // Accurate customer name from leads table
      const customerName =
        lead?.full_name?.trim() ||
        (typeof meta.client_name === "string" && meta.client_name.trim() ? meta.client_name.trim() : "Valuation Customer");

      // Accurate vehicle details
      const carYear = lead?.year ? `${lead.year} ` : "";
      const carMake = lead?.make ? `${lead.make} ` : "";
      const carModel = lead?.model ? `${lead.model}` : "";
      const vehicleDetails = `${carYear}${carMake}${carModel}`.trim() || "Inquiry Vehicle";

      // Accurate staff member who committed the error / check-in
      const agentName =
        staffProfile?.display_name ||
        (typeof meta.actor_name === "string" && event.type === "arrival_reversal_requested" ? meta.actor_name : "Staff Agent");

      const agentRole =
        (staffProfile?.role as StaffRole) ||
        (meta.actor_role as StaffRole) ||
        "call_center";

      // Resolve approver display name
      let approverName = "Sir Nash (Super Admin)";
      if (event.type === "arrival_reversal_requested") {
        approverName = "Pending Sir Nash Approval";
      } else if (approverProfile) {
        const roleLabel = approverProfile.role === "admin" ? "Super Admin" : approverProfile.role;
        approverName = `${approverProfile.display_name ?? "Admin"} (${roleLabel})`;
      } else if (typeof meta.reverted_by === "string" && !meta.reverted_by.includes("-")) {
        approverName = meta.reverted_by.trim();
      }

      // Accurate stated reason or explanation
      const reason =
        typeof meta.reason === "string" && meta.reason.trim()
          ? meta.reason.trim()
          : typeof meta.explanation === "string" && meta.explanation.trim()
          ? meta.explanation.trim()
          : "Customer arrival status turned off (Reverted to Not Yet Arrived)";

      const isPending = event.type === "arrival_reversal_requested";
      const incidentType: IncidentType = "arrival_reversal";
      const incidentLabel = isPending ? "Arrival Reversal Request" : "Arrival Reversal";
      const status: IncidentStatus = isPending ? "pending_approval" : "reverted";

      return {
        id: event.id,
        leadId: event.lead_id,
        agentId: erroneousStaffId,
        agentName,
        agentRole,
        customerName,
        vehicleDetails,
        incidentType,
        incidentLabel,
        reason,
        timestamp: event.created_at,
        status,
        approvedBy: approverName,
      };
    });

    // Return strictly accurate real database records
    return NextResponse.json({
      ok: true,
      data: { records: mappedRecords },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
  }
}
