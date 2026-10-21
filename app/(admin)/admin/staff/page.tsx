import { Suspense } from "react";
import { StaffPageClient } from "@/components/admin/StaffPageClient";
import { requireAdmin } from "@/lib/server/require-admin";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { buildIdentity, type StaffRole } from "@/lib/auth/permissions";
import type { StaffSummary } from "@/lib/admin/staff-schema";

export const dynamic = "force-dynamic";

/**
 * Standalone Staff Management page — Super Admin only.
 *
 * Includes switchable tabs:
 * 1. Staff Accounts & Directory (account provisioning, role assignments, status)
 * 2. Staff Error & Reversal Report (incident logs, undo reasons, mistake frequency)
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
      <Suspense fallback={<div className="p-8 text-text-muted text-sm">Loading staff management...</div>}>
        <StaffPageClient viewer={viewer} initialStaff={demoStaff} canManageStaff={true} />
      </Suspense>
    );
  }

  const admin = await requireAdmin();
  if (!admin.ok) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-fluid-3 text-text">Staff Management</h1>
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
    <Suspense fallback={<div className="p-8 text-text-muted text-sm">Loading staff management...</div>}>
      <StaffPageClient
        viewer={admin.identity}
        initialStaff={initialStaff}
        canManageStaff={true}
      />
    </Suspense>
  );
}
