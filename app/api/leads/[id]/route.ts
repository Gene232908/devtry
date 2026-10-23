import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ADMIN_PREVIEW, PREVIEW_NOTICE } from "@/lib/admin/preview-mode";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";
import { pickNextAssignee } from "@/lib/server/lead-assignment";
import { canRoleSetStatus, canSeeLead } from "@/lib/auth/lead-visibility";
import { createInspectionScheduleNotifications } from "@/lib/server/inspection-schedule-notifications";
import { arrivalResetForRescheduledInspection } from "@/lib/server/inspection-reschedule";
import {
  dispatchArrivalNotification,
  dispatchArrivalReversalRequestNotification,
} from "@/lib/server/lead-notifications";

// "deal" = the customer agreed to sell; "closed" = met but no agreement.
// "valuation_sent" stays accepted so historical rows can still be written back,
// but it is no longer offered anywhere in the UI.
const STATUSES = new Set([
  "new",
  "pending",
  "contacted",
  "inspection_scheduled",
  "no_show",
  "inspected",
  "negotiating",
  "deal",
  "closed",
  "valuation_sent",
]);

type LeadEventInsert = { lead_id: string; type: string; meta: Record<string, unknown> };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  // Milestone 2: the dashboard is a design preview, so admin writes are refused
  // at the server too ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the UI guard alone would still leave this endpoint open
  // to anything holding a session.
  if (ADMIN_PREVIEW) {
    return NextResponse.json(
      { ok: false, error: { message: PREVIEW_NOTICE } },
      { status: 403 },
    );
  }

  // Middleware only proves a valid session exists. This resolves WHO is acting,
  // which is what every guard below is written against ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â until now this endpoint
  // checked nothing beyond "signed in", so any staff account could edit any lead
  // in the company just by knowing its id.
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }
  const { role, userId } = auth.identity;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const id = resolvedParams.id;
  let body: {
    status?: unknown;
    estimated_value_aed?: unknown;
    notes?: unknown;
    is_spam?: unknown;
    purchase_price_aed?: unknown;
    purchased_at?: unknown;
    inspection_scheduled_at?: unknown;
    purchaser_id?: unknown;
    arrival_status?: unknown;
    original_arrived_by?: unknown;
    reason?: unknown;
    request_arrival_reversal?: unknown;
    decline_arrival_reversal?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Load the current row so we can record meaningful timeline diffs ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â and so
  // the role guards below decide against what the database says rather than
  // against anything the caller sent.
  const loadCurrent = (fields: string) => supabase.from("leads").select(fields).eq("id", id).single();

  let { data: currentRow, error: loadError } = await loadCurrent(
    "id, full_name, status, inquiry_type, estimated_value_aed, notes, is_spam, call_center_id, purchaser_id, inspection_scheduled_at, arrival_status, arrived_by, arrived_at, year, make, model, trim",
  );

  // Same fallback as GET /api/admin/leads: a live database that has not run
  // migration 0024 yet must still be able to save a lead.
  if (loadError && /inspection_scheduled_at|arrival_status|arrived_by|arrived_at/.test(loadError.message ?? "")) {
    ({ data: currentRow, error: loadError } = await loadCurrent(
      "id, full_name, status, estimated_value_aed, notes, is_spam, call_center_id, purchaser_id, year, make, model, trim",
    ));
  }

  if (loadError || !currentRow) {
    return NextResponse.json({ ok: false, error: { message: "Lead not found." } }, { status: 404 });
  }

  const current = currentRow as unknown as {
    id: string;
    full_name: string;
    status: string;
    estimated_value_aed: number | string | null;
    notes: string | null;
    is_spam: boolean | null;
    call_center_id: string | null;
    purchaser_id: string | null;
    inquiry_type?: "valuation" | "scrap" | null;
    inspection_scheduled_at?: string | null;
    arrival_status?: "not_arrived" | "arrived" | null;
    arrived_by?: string | null;
    arrived_at?: string | null;
    year?: number | null;
    make?: string | null;
    model?: string | null;
    trim?: string | null;
  };

  // Ownership. A lead belongs to exactly one agent and, once handed over, to
  // exactly one purchaser; only that person ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â or an owner, who sees everything ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
  // may write to it.
  if (!hasCapability(auth.identity, "viewAllLeads")) {
    const ownsLead = canSeeLead(
      { status: current.status, callCenterId: current.call_center_id, purchaserId: current.purchaser_id },
      role,
      userId,
    );

    if (!ownsLead) {
      // 404 rather than 403: a staff member has no business learning that a lead
      // they cannot see exists at all.
      return NextResponse.json({ ok: false, error: { message: "Lead not found." } }, { status: 404 });
    }
  }

  const update: Record<string, unknown> = {};
  const events: LeadEventInsert[] = [];
  let inspectionReschedule: { previous: string; next: string } | null = null;
  const eventMeta = (meta: Record<string, unknown>) => ({
    ...meta,
    actor_name: auth.identity.displayName,
    actor_role: auth.identity.role,
  });

  // Checked before the deal branch below, so an agent cannot reach
  // record_lead_deal() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â and a purchaser cannot walk a lead back to "contacted".
  if (typeof body.status === "string" && body.status !== current.status) {
    if (role === "call_center" && current.arrival_status === "arrived") {
      return NextResponse.json(
        { ok: false, error: { message: "Status is locked after Customer Service confirms customer arrival." } },
        { status: 409 },
      );
    }
    if (!canRoleSetStatus(role, body.status)) {
      return NextResponse.json(
        { ok: false, error: { message: "That status is not available for your role." } },
        { status: 403 },
      );
    }
  }

  // "Deal" means the car was bought, so it is the one status that carries money
  // with it. It is handled through record_lead_deal() rather than a plain status
  // write: that function moves the lead and creates the inventory row in a
  // single transaction, so a lead can never end up marked as bought with no car
  // behind it. Re-sending a price for a lead already at Deal corrects a typo.
  const becomingDeal = body.status === "deal";
  const correctingDealPrice = current.status === "deal" && body.purchase_price_aed !== undefined;

  if (becomingDeal || correctingDealPrice) {
    const price = Number(body.purchase_price_aed);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { ok: false, error: { message: "Enter the price the car was actually bought for." } },
        { status: 400 },
      );
    }

    const purchasedAt =
      typeof body.purchased_at === "string" && body.purchased_at.trim() !== ""
        ? new Date(body.purchased_at)
        : new Date();

    if (Number.isNaN(purchasedAt.getTime())) {
      return NextResponse.json({ ok: false, error: { message: "Invalid purchase date." } }, { status: 400 });
    }

    const { error: dealError } = await supabase.rpc("record_lead_deal", {
      p_lead_id: id,
      p_purchase_price: price,
      p_purchased_at: purchasedAt.toISOString(),
    });

    if (dealError) {
      // The function raises a readable message for the cases the owner can
      // actually act on (already sold, price not positive), so pass it through
      // rather than replacing it with something generic.
      return NextResponse.json({ ok: false, error: { message: dealError.message } }, { status: 400 });
    }

    if (current.status !== "deal") {
      events.push({ lead_id: id, type: "status_change", meta: eventMeta({ from: current.status, to: "deal" }) });
    }
    events.push({ lead_id: id, type: "car_purchased", meta: eventMeta({ purchase_price_aed: price }) });
  } else if (typeof body.status === "string") {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ ok: false, error: { message: "Invalid status." } }, { status: 400 });
    }

    // A lead that has a car cannot leave "deal".
    //
    // record_lead_deal() guarantees a lead at 'deal' has an inventory row, but
    // nothing guarded the way back out ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â so moving the lead to any other status
    // left the car stranded: still in Inventory, still holding the money paid
    // for it, but no longer reachable from a lead anyone would look at. If that
    // car is later sold, its commission is calculated against a purchase the
    // lead no longer claims to have made.
    //
    // This is not hypothetical. It happened twice in ten seconds on one lead in
    // production, because the detail form could silently re-seed its status
    // field from a stale copy of the lead and the next Save wrote that stale
    // value back. The form bug is fixed too, but the invariant belongs here:
    // this is the only place every client has to come through.
    //
    // Undoing a purchase is a real thing an owner may need, but it means
    // removing a car from stock and unwinding money ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a deliberate action with
    // its own confirmation, not a side effect of changing a dropdown.
    if (current.status === "deal" && body.status !== "deal") {
      const { data: car } = await supabase
        .from("inventory")
        .select("id, status")
        .eq("lead_id", id)
        .maybeSingle();

      if (car) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message:
                "This lead has a car recorded against it in Inventory, so it cannot be moved out of Deal. Withdraw the car from Inventory first if the purchase did not go ahead.",
            },
          },
          { status: 409 },
        );
      }
    }

    if (body.status !== current.status) {
      update.status = body.status;
      events.push({ lead_id: id, type: "status_change", meta: eventMeta({ from: current.status, to: body.status }) });
    }
  }

  // Who a lead belongs to is decided by the round-robin below and by the
  // owner-only assignment endpoint ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â never by whatever the browser posted. The
  // dashboard used to compute an assignee client-side from a hardcoded demo list
  // and send it here, so any caller could hand themselves someone else's lead.
  if ("purchaser_id" in body && hasCapability(auth.identity, "assignLeads")) {
    const raw = body.purchaser_id;
    update.purchaser_id = raw === null || raw === "" ? null : String(raw);
  }

  // Purchasers read the inspection time; they do not set it. Only the agent
  // working the lead (or an owner) decides when the customer is coming in.
  if ("inspection_scheduled_at" in body && role !== "purchaser") {
    const raw = body.inspection_scheduled_at;
    const value = raw === null || raw === "" ? null : String(raw);

    if (value !== null && Number.isNaN(new Date(value).getTime())) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid inspection date and time." } },
        { status: 400 },
      );
    }

    const previous = current.inspection_scheduled_at ?? null;
    const changed = previous !== value &&
      (previous === null || value === null || new Date(previous).getTime() !== new Date(value).getTime());
    if (changed) {
      update.inspection_scheduled_at = value;
      if (previous && value) {
        inspectionReschedule = { previous, next: value };
        events.push({
          lead_id: id,
          type: "inspection_rescheduled",
          meta: eventMeta({ previous_scheduled_at: previous, scheduled_at: value }),
        });

        // An arrival is valid for only one appointment. A moved appointment
        // must be confirmed again before it can unlock the inspection workflow.
        const arrivalReset = arrivalResetForRescheduledInspection(previous, value, current.arrival_status);
        if (arrivalReset) {
          Object.assign(update, arrivalReset);
          events.push({
            lead_id: id,
            type: "arrival_reset_due_to_reschedule",
            meta: eventMeta({ previous_scheduled_at: previous, scheduled_at: value }),
          });
        }
      } else if (value) {
        events.push({
          lead_id: id,
          type: "inspection_scheduled",
          meta: eventMeta({ scheduled_at: value }),
        });
      }
    }
  }

  if ("estimated_value_aed" in body) {
    const raw = body.estimated_value_aed;
    const value = raw === null || raw === "" ? null : Number(raw);
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ ok: false, error: { message: "Invalid value." } }, { status: 400 });
    }
    update.estimated_value_aed = value;
    events.push({ lead_id: id, type: "value_updated", meta: eventMeta({ value }) });
  }

  if (typeof body.notes === "string" && body.notes !== (current.notes ?? "")) {
    update.notes = body.notes;
    events.push({ lead_id: id, type: "note_updated", meta: eventMeta({ note: body.notes }) });
  }

  if (typeof body.is_spam === "boolean" && body.is_spam !== current.is_spam) {
    update.is_spam = body.is_spam;
    events.push({ lead_id: id, type: "marked_spam", meta: eventMeta({ is_spam: body.is_spam }) });
    if (body.is_spam && current.status !== "closed") {
      update.status = "closed";
      events.push({ lead_id: id, type: "status_change", meta: eventMeta({ from: current.status, to: "closed" }) });
    }
  }

  // Scheduling the inspection IS the hand-over: it is the single moment a lead
  // stops being the agent's and becomes a purchaser's. Both halves of that live
  // here rather than in the form, because the form is only one client.
  // `becomingDeal` writes the status through record_lead_deal() rather than
  // through `update`, so it has to be read back explicitly here.
  const resultingStatus = becomingDeal ? "deal" : (update.status as string | undefined) ?? current.status;

  if (resultingStatus === "inspection_scheduled") {
    const scheduledAt =
      "inspection_scheduled_at" in update
        ? (update.inspection_scheduled_at as string | null)
        : current.inspection_scheduled_at ?? null;

    // Required when the lead is being MOVED to Inspection Scheduled, or when the
    // date itself is being edited. A lead already sitting at this status with no
    // date ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a row written before the date existed ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â is not blocked from having
    // its notes saved.
    const mustHaveDate = update.status === "inspection_scheduled" || "inspection_scheduled_at" in update;

    if (mustHaveDate && !scheduledAt) {
      return NextResponse.json(
        { ok: false, error: { message: "Set the scheduled inspection date and time before scheduling." } },
        { status: 400 },
      );
    }

    // Round-robin onto the next purchaser. Skipped when one already holds the
    // lead ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a re-save must not shuffle it to somebody else mid-negotiation ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
    // and when an owner named someone in this same request.
    if (!("purchaser_id" in update) && !current.purchaser_id) {
      const purchaserId = await pickNextAssignee("purchaser");
      if (purchaserId) {
        update.purchaser_id = purchaserId;
        events.push({
          lead_id: id,
          type: "assigned",
          meta: eventMeta({ purchaser_id: purchaserId, reason: "inspection_scheduled" }),
        });
      }
    }
  }

  // Arrival is a Call Centre confirmation, not a pipeline state. It becomes
  // available only after the inspection has been saved and a Purchaser owns the
  // handoff; purchasers can see it but cannot mark their own customer arrived.
  // This must happen before the shared lead write below, otherwise the UI can
  // briefly show a toggled state while no arrival value is ever persisted.
  if ("arrival_status" in body) {
    if (role !== "call_center" && role !== "admin" && role !== "manager") {
      return NextResponse.json({ ok: false, error: { message: "Only Call Centre or Admin can record customer arrival." } }, { status: 403 });
    }
    if (body.arrival_status !== "arrived" && body.arrival_status !== "not_arrived") {
      return NextResponse.json({ ok: false, error: { message: "Invalid arrival status value." } }, { status: 400 });
    }

    if (body.arrival_status === "not_arrived") {
      if (role !== "admin" && role !== "manager") {
        return NextResponse.json({ ok: false, error: { message: "Only Admin can turn off customer arrival." } }, { status: 403 });
      }
      if (current.arrival_status !== "not_arrived") {
        const originalArrivedBy =
          current.arrived_by ||
          (typeof body.original_arrived_by === "string" ? body.original_arrived_by : null);
        const originalArrivedAt = current.arrived_at || null;
        const reason =
          typeof body.reason === "string" && body.reason.trim()
            ? body.reason.trim()
            : "Customer arrival status turned off (Reverted to Not Yet Arrived)";

        update.arrival_status = "not_arrived";
        update.arrived_at = null;
        update.arrived_by = null;
        events.push({
          lead_id: id,
          type: "arrival_reverted",
          meta: eventMeta({
            arrival_status: "not_arrived",
            reverted_by: userId,
            original_arrived_by: originalArrivedBy,
            original_arrived_at: originalArrivedAt,
            reason,
          }),
        });
      }
    } else {
      const ALLOWED_ARRIVAL_STAGES = new Set(["inspection_scheduled", "inspected", "negotiating", "deal"]);
      if (!ALLOWED_ARRIVAL_STAGES.has(current.status) || !current.purchaser_id) {
        return NextResponse.json({ ok: false, error: { message: "Arrival is available only for a saved inspection with an assigned Purchaser." } }, { status: 409 });
      }
      if (current.arrival_status !== "arrived") {
        update.arrival_status = "arrived";
        update.arrived_at = new Date().toISOString();
        update.arrived_by = userId;
        events.push({ lead_id: id, type: "arrival_confirmed", meta: eventMeta({ arrival_status: "arrived" }) });
      }
    }
  }

  // Customer Service requesting arrival reversal from Sir Nash
  if (body.request_arrival_reversal === true && typeof body.reason === "string" && body.reason.trim()) {
    if (current.arrival_status !== "arrived") {
      return NextResponse.json(
        { ok: false, error: { message: "Cannot request arrival reversal: customer is not currently marked as arrived." } },
        { status: 400 },
      );
    }
    const reasonText = body.reason.trim();
    const requesterName = auth.identity.displayName || "Customer Service";
    const requesterRole = auth.identity.role || "call_center";

    events.push({
      lead_id: id,
      type: "arrival_reversal_requested",
      meta: eventMeta({
        reason: reasonText,
        requested_by: userId,
        requested_by_name: requesterName,
        requested_by_role: requesterRole,
      }),
    });

    const carVehicle = [current.year, current.make, current.model, current.trim].filter(Boolean).join(" ");
    await dispatchArrivalReversalRequestNotification(supabase, {
      leadId: id,
      customerName: current.full_name || "Valuation Customer",
      vehicle: carVehicle,
      requesterName,
      requesterRole,
      reason: reasonText,
    });
  }

  // Super Admin declining an arrival reversal request
  if (body.decline_arrival_reversal === true) {
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { ok: false, error: { message: "Only Admin can decline arrival reversal requests." } },
        { status: 403 },
      );
    }
    events.push({
      lead_id: id,
      type: "arrival_reversal_declined",
      meta: eventMeta({
        declined_by: userId,
        declined_by_name: auth.identity.displayName || "Sir Nash",
      }),
    });
  }

  // Only "nothing happened" when there is also nothing to record. Recording a
  // deal writes through record_lead_deal() and leaves `update` empty, so
  // checking the update alone would drop its timeline entries on the floor.
  if (Object.keys(update).length === 0 && events.length === 0) {
    return NextResponse.json({ ok: true, data: { id, unchanged: true } });
  }

  if (Object.keys(update).length > 0) {
    const { error: updateError } = await supabase.from("leads").update(update).eq("id", id);
    if (updateError) {
      console.error("[PATCH /api/leads/[id]] Error updating lead:", updateError);
      // Fallback for live Supabase databases that have not run migration 0024 yet
      if (updateError.message?.includes("inspection_scheduled_at")) {
        const fallbackUpdate = { ...update };
        delete fallbackUpdate.inspection_scheduled_at;
        const { error: fallbackError } = await supabase.from("leads").update(fallbackUpdate).eq("id", id);
        if (!fallbackError) {
          return NextResponse.json({ ok: true, data: { id, fallbackSchemaNotice: true } });
        }
      }
      return NextResponse.json({ ok: false, error: { message: updateError.message } }, { status: 500 });
    }
  }

  if (events.length > 0) {
    const { data: savedEvents, error: eventError } = await supabase
      .from("lead_events")
      .insert(events.map((event) => ({ ...event, actor: userId })))
      .select("id, type");
    if (eventError) {
      // The lead update has already succeeded. Keep that success truthful for
      // the person saving, but make an audit-write failure visible to operators
      // instead of silently dropping the history entry.
      console.error("[PATCH /api/leads/[id]] Activity record failed:", eventError);
    } else if (inspectionReschedule) {
      const eventId = (savedEvents ?? []).find((event: { id: string; type: string }) => event.type === "inspection_rescheduled")?.id;
      const purchaserId = typeof update.purchaser_id === "string" ? update.purchaser_id : current.purchaser_id;
      if (eventId) {
        try {
          await createInspectionScheduleNotifications({
            eventId,
            leadId: id,
            leadName: current.full_name,
            purchaserId,
            previousScheduledAt: inspectionReschedule.previous,
            scheduledAt: inspectionReschedule.next,
            changedByName: auth.identity.displayName,
          });
        } catch (notificationError) {
          // The date change and its audit event already succeeded. A missing
          // notification migration must not make the appointment impossible to
          // save, but the server log keeps the deployment gap observable.
          console.error("[PATCH /api/leads/[id]] Inspection notification failed:", notificationError);
        }
      }
    }
  }

  if (update.arrival_status === "arrived") {
    const vehicle = [current.year, current.make, current.model, current.trim].filter(Boolean).join(" ");
    await dispatchArrivalNotification(supabase, {
      leadId: id,
      customerName: current.full_name,
      vehicle,
      inquiryType: current.inquiry_type ?? "valuation",
      purchaserId: typeof update.purchaser_id === "string" ? update.purchaser_id : current.purchaser_id,
      actorDisplayName: auth.identity.displayName,
    });
  }

  return NextResponse.json({ ok: true, data: { id } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, data: { pendingReversal: null } });
  }

  const supabase = getSupabaseAdmin();
  const id = resolvedParams.id;

  const { data: lead } = await supabase
    .from("leads")
    .select("id, arrival_status")
    .eq("id", id)
    .maybeSingle();

  if (!lead || lead.arrival_status !== "arrived") {
    return NextResponse.json({ ok: true, data: { pendingReversal: null } });
  }

  const { data: recentEvents } = await supabase
    .from("lead_events")
    .select("id, type, meta, created_at")
    .eq("lead_id", id)
    .in("type", [
      "arrival_reversal_requested",
      "arrival_reverted",
      "arrival_reset_due_to_reschedule",
      "arrival_reversal_declined",
    ])
    .order("created_at", { ascending: false })
    .limit(5);

  const topEvent = recentEvents?.[0];
  if (topEvent && topEvent.type === "arrival_reversal_requested") {
    const meta = (topEvent.meta as Record<string, unknown>) ?? {};
    return NextResponse.json({
      ok: true,
      data: {
        pendingReversal: {
          leadId: id,
          reason: typeof meta.reason === "string" ? meta.reason : "Reversal requested by CSR",
          requestedBy: typeof meta.requested_by_name === "string" ? meta.requested_by_name : "Customer Service",
          requestedAt: topEvent.created_at,
        },
      },
    });
  }

  return NextResponse.json({ ok: true, data: { pendingReversal: null } });
}
