import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { formatScheduledInspection, STATUS_LABEL } from "@/lib/format";
import { ROLE_LABELS, type StaffRole } from "@/lib/auth/permissions";
import { canSeeLead } from "@/lib/auth/lead-visibility";
import { requireStaff } from "@/lib/server/require-staff";
import { LEAD_VIEWED, VIEW_DEDUPE_MINUTES } from "@/lib/admin/lead-events";

type DbLeadEvent = {
  id: string;
  type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  actor: string | null;
};

type ActorSnapshot = { name: string; role: StaffRole };

function actorLabel(meta: Record<string, unknown>, actor?: ActorSnapshot): string | null {
  const name = typeof meta.actor_name === "string" ? meta.actor_name : actor?.name;
  const rawRole = typeof meta.actor_role === "string" ? meta.actor_role : actor?.role;
  const role = rawRole && rawRole in ROLE_LABELS ? rawRole as StaffRole : undefined;
  if (!name) return null;
  return role ? `${name} (${ROLE_LABELS[role]})` : name;
}

function actionBy(meta: Record<string, unknown>, actor?: ActorSnapshot): string {
  const label = actorLabel(meta, actor);
  return label ? ` by ${label}` : "";
}

function messageFor(event: DbLeadEvent, actor?: ActorSnapshot): string {
  const meta = event.meta ?? {};
  switch (event.type) {
    case LEAD_VIEWED: {
      const name = typeof meta.viewer_name === "string" ? meta.viewer_name : actor?.name;
      const roleValue = typeof meta.viewer_role === "string" ? meta.viewer_role as StaffRole : actor?.role;
      return name && roleValue
        ? `Viewed by ${name} (${ROLE_LABELS[roleValue]}).`
        : "Viewed before staff view tracking was enabled.";
    }
    case "lead_created": {
      const source = typeof meta.source === "string" ? meta.source : "website";
      const sourceLabel = source === "website"
        ? "website valuation form"
        : source.replace(/^manual_/, "").replace(/_/g, " ");
      const sourceNote = typeof meta.source_note === "string" && meta.source_note.trim()
        ? ` Source detail: ${meta.source_note.trim()}`
        : "";
      const referral = typeof meta.referral_type === "string" && meta.referral_type !== "none"
        ? ` Referral recorded: ${meta.referral_type === "employee" ? "employee" : "client"}.`
        : "";
      return `Lead created${actionBy(meta, actor)} via ${sourceLabel}.${sourceNote}${referral}`;
    }
    case "status_change": {
      const from = STATUS_LABEL[String(meta.from)] ?? String(meta.from ?? "");
      const to = STATUS_LABEL[String(meta.to)] ?? String(meta.to ?? "");
      return `Status changed${actionBy(meta, actor)}: ${from} → ${to}.`;
    }
    case "value_updated": return meta.value != null ? `Estimated value set${actionBy(meta, actor)} to AED ${Number(meta.value).toLocaleString()}.` : `Estimated value cleared${actionBy(meta, actor)}.`;
    case "note_updated": {
      const note = typeof meta.note === "string" ? meta.note.trim() : "";
      return note ? `Note saved${actionBy(meta, actor)}: ${note}` : `Note cleared${actionBy(meta, actor)}.`;
    }
    case "car_purchased": return meta.purchase_price_aed != null ? `Car bought${actionBy(meta, actor)} for AED ${Number(meta.purchase_price_aed).toLocaleString()} and added to Inventory.` : `Car added to Inventory${actionBy(meta, actor)}.`;
    case "marked_spam": return meta.is_spam === false ? `Unmarked as spam${actionBy(meta, actor)}.` : `Marked as spam${actionBy(meta, actor)}.`;
    case "assigned": return `Lead assignment updated${actionBy(meta, actor)}.`;
    case "arrival_confirmed": return `Customer arrival confirmed${actionBy(meta, actor)}.`;
    case "inspection_scheduled": {
      const scheduledAt = typeof meta.scheduled_at === "string" ? formatScheduledInspection(meta.scheduled_at) : "the selected date and time";
      return `Inspection scheduled${actionBy(meta, actor)} for ${scheduledAt}.`;
    }
    case "inspection_rescheduled": {
      const previous = typeof meta.previous_scheduled_at === "string" ? formatScheduledInspection(meta.previous_scheduled_at) : "the previous appointment";
      const next = typeof meta.scheduled_at === "string" ? formatScheduledInspection(meta.scheduled_at) : "the new appointment";
      return `Inspection rescheduled${actionBy(meta, actor)}: ${previous} → ${next}.`;
    }
    case "inspection_completed": return `Inspection report completed${actionBy(meta, actor)}.`;
    case "inspection_card_updated": {
      const card = typeof meta.card === "string" ? meta.card : "Inspection section";
      return `${card} updated${actionBy(meta, actor)}.`;
    }
    case "inspection_photo_added": return `Inspection photo added${actionBy(meta, actor)}: ${String(meta.angle ?? "Photo")}.`;
    case "inspection_photo_replaced": return `Inspection photo replaced${actionBy(meta, actor)}: ${String(meta.angle ?? "Photo")}.`;
    case "inspection_photos_expired": return `Inspection photos removed after the 60-day post-sale retention period.`;
    case "recovered": return "Lead recovered from an abandoned valuation form.";
    default: return event.type;
  }
}

async function authorizeLead(id: string) {
  const auth = await requireStaff();
  if (!auth.ok) return { error: NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status }) };
  const supabase = getSupabaseAdmin();
  const { data: lead, error } = await supabase.from("leads").select("status, call_center_id, purchaser_id").eq("id", id).maybeSingle();
  if (error || !lead || !canSeeLead({ status: lead.status, callCenterId: lead.call_center_id, purchaserId: lead.purchaser_id }, auth.identity.role, auth.identity.userId)) {
    return { error: NextResponse.json({ ok: false, error: { message: "Lead not found." } }, { status: 404 }) };
  }
  return { auth, supabase };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  const access = await authorizeLead(params.id);
  if ("error" in access) return access.error;

  const { data, error } = await access.supabase
    .from("lead_events")
    .select("id, type, meta, created_at, actor")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });

  const rows = (data ?? []) as DbLeadEvent[];
  const actorIds = Array.from(new Set(rows
    .filter((row) => row.actor && (typeof row.meta?.actor_name !== "string" || typeof row.meta?.actor_role !== "string") && (typeof row.meta?.viewer_name !== "string" || typeof row.meta?.viewer_role !== "string"))
    .map((row) => row.actor as string)));
  const { data: profiles, error: profilesError } = actorIds.length
    ? await access.supabase.from("profiles").select("id, display_name, role").in("id", actorIds)
    : { data: [], error: null };
  if (profilesError) return NextResponse.json({ ok: false, error: { message: profilesError.message } }, { status: 500 });

  const actors = new Map((profiles ?? []).map((profile: { id: string; display_name: string | null; role: StaffRole }) => [profile.id, { name: profile.display_name ?? "Staff member", role: profile.role }]));
  const viewRows = rows.filter((row) => row.type === LEAD_VIEWED);

  return NextResponse.json({
    ok: true,
    data: {
      events: rows.map((row) => ({
        id: row.id,
        type: row.type,
        message: messageFor(row, row.actor ? actors.get(row.actor) : undefined),
        createdAt: row.created_at,
        ...(row.type === "note_updated" && typeof row.meta?.note === "string" ? { note: row.meta.note } : {}),
        ...(row.actor ? { actorLabel: actorLabel(row.meta ?? {}, actors.get(row.actor)) ?? undefined } : {}),
      })),
      views: { count: viewRows.length, lastAt: viewRows[0]?.created_at ?? null },
    },
  });
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  const access = await authorizeLead(params.id);
  if ("error" in access) return access.error;

  const since = new Date(Date.now() - VIEW_DEDUPE_MINUTES * 60 * 1000).toISOString();
  const { data: recent, error: recentError } = await access.supabase
    .from("lead_events")
    .select("id")
    .eq("lead_id", params.id)
    .eq("type", LEAD_VIEWED)
    .eq("actor", access.auth.identity.userId)
    .gte("created_at", since)
    .limit(1);
  if (recentError) return NextResponse.json({ ok: false, error: { message: recentError.message } }, { status: 500 });
  if (recent.length > 0) return NextResponse.json({ ok: true, data: { recorded: false } });

  const { error } = await access.supabase.from("lead_events").insert({
    lead_id: params.id,
    actor: access.auth.identity.userId,
    type: LEAD_VIEWED,
    meta: { viewer_name: access.auth.identity.displayName, viewer_role: access.auth.identity.role },
  });
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ ok: true, data: { recorded: true } });
}
