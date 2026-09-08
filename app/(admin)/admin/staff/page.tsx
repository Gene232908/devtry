import { StaffAccounts } from "@/components/admin/StaffAccounts";
import { requireAdmin } from "@/lib/server/require-admin";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { buildIdentity, type StaffRole } from "@/lib/auth/permissions";
import type { StaffSummary } from "@/lib/admin/staff-schema";

export const dynamic = "force-dynamic";

/**
 * Standalone Staff Accounts page — Super Admin only.
 *
 * Previously embedded inside the Settings page. Now has its own sidebar entry
 * and full-page layout so staff management doesn't compete with contact settings
 * for screen space.
 */
export default async function AdminStaffPage() {
  // Preview mode: render with synthetic data
  if (ADMIN_PREVIEW) {
    const viewer = buildIdentity("preview", "admin", "Preview Admin");
    const demoStaff: StaffSummary[] = [
      { id: "demo-1", email: "agent@carvibe.ae", displayName: "Maricel", role: "call_center", isActive: true },
      { id: "demo-2", email: "buyer@carvibe.ae", displayName: "Ahmed", role: "purchaser", isActive: true },
      { id: "demo-3", email: "owner@carvibe.ae", displayName: "Sir Nash", role: "admin", isActive: true },
    ];
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-fluid-3 text-text">Staff Accounts</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Create, edit, enable, and disable staff accounts. Assign roles to control what each person can see.
          </p>
        </div>
        <StaffAccounts viewer={viewer} initialStaff={demoStaff} canManageStaff={true} />
      </div>
    );
  }

  const admin = await requireAdmin();
  if (!admin.ok) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-fluid-3 text-text">Staff Accounts</h1>
        <p className="text-fluid--1 text-danger">Only Super Admins can manage staff accounts.</p>
      </div>
    );
  }

  let initialStaff: StaffSummary[] = [];
  if (isSupabaseConfigured()) {
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Staff Accounts</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          Create, edit, enable, and disable staff accounts. Assign roles to control what each person can see.
        </p>
      </div>
      <StaffAccounts
        viewer={admin.identity}
        initialStaff={initialStaff}
        canManageStaff={true}
      />
    </div>
  );
}
