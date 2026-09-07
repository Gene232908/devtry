import SettingsClient from "./settings-client";
import { fetchSettings } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/server/require-admin";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { StaffSummary } from "@/lib/admin/staff-schema";
import type { StaffRole } from "@/lib/auth/permissions";

// Settings are read on every visit — never a cached copy, or the form would
// open on values that have since changed and save them straight back.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // Both halves matter: the row to show, and whether this account may change
  // it. The write itself is authorized again in the PATCH route — this only
  // decides whether the form is offered as editable.
  const [result, admin] = await Promise.all([fetchSettings(), requireAdmin()]);

  // Fetch staff list for the Staff Accounts panel (owner-only).
  let initialStaff: StaffSummary[] = [];
  if (admin.ok && isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("profiles")
      .select("id, email, display_name, role, is_active")
      .order("created_at", { ascending: true });

    initialStaff = (data ?? []).map((p) => ({
      id: p.id as string,
      email: (p.email as string | null) ?? "",
      displayName: (p.display_name as string | null) ?? (p.email as string | null) ?? (p.id as string),
      role: p.role as StaffRole,
      isActive: (p.is_active as boolean | null) !== false,
    }));
  }

  return (
    <SettingsClient
      initialSettings={result.ok ? result.data.settings : null}
      initialManagers={result.ok ? result.data.managers : []}
      initialError={result.ok ? null : result.message}
      canEdit={admin.ok}
      viewer={admin.ok ? admin.identity : null}
      initialStaff={initialStaff}
    />
  );
}

