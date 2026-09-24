import { getSupabaseAdmin } from "@/lib/supabase/admin";

type InspectionScheduleNotificationInput = {
  eventId: string;
  leadId: string;
  leadName: string;
  purchaserId: string | null;
  previousScheduledAt: string;
  scheduledAt: string;
  changedByName: string;
};

/**
 * Creates one private alert for the assigned Purchaser and each active owner.
 * It is deliberately called after the lead event has been recorded: the event
 * remains the permanent audit trail even if a deployment has not yet applied
 * the notification-table migration.
 */
export async function createInspectionScheduleNotifications(input: InspectionScheduleNotificationInput) {
  const supabase = getSupabaseAdmin();
  const { data: owners, error: ownersError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("role", ["admin", "manager"])
    .eq("is_active", true);
  if (ownersError) throw ownersError;

  const recipientIds = new Set((owners ?? []).map((owner) => owner.id));
  if (input.purchaserId) recipientIds.add(input.purchaserId);
  if (recipientIds.size === 0) return;

  let purchaserName: string | null = null;
  if (input.purchaserId) {
    const { data: purchaser, error: purchaserError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", input.purchaserId)
      .maybeSingle();
    if (purchaserError) throw purchaserError;
    purchaserName = purchaser?.display_name ?? "Assigned Purchaser";
  }

  const rows = Array.from(recipientIds, (recipientId) => ({
    event_id: input.eventId,
    lead_id: input.leadId,
    recipient_id: recipientId,
    lead_name: input.leadName,
    assigned_purchaser_name: purchaserName,
    previous_scheduled_at: input.previousScheduledAt,
    scheduled_at: input.scheduledAt,
    changed_by_name: input.changedByName,
  }));
  const { error } = await supabase
    .from("inspection_schedule_notifications")
    .upsert(rows, { onConflict: "event_id,recipient_id", ignoreDuplicates: true });
  if (error) throw error;
}
