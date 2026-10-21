"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, AlertTriangle } from "lucide-react";
import { StaffAccounts } from "@/components/admin/StaffAccounts";
import { StaffErrorReport } from "@/components/admin/StaffErrorReport";
import type { StaffIdentity } from "@/lib/auth/permissions";
import type { StaffSummary } from "@/lib/admin/staff-schema";

type TabId = "accounts" | "report";

type Props = {
  viewer: StaffIdentity;
  initialStaff: StaffSummary[];
  canManageStaff: boolean;
};

export function StaffPageClient({ viewer, initialStaff, canManageStaff }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam === "report" ? "report" : "accounts"
  );

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "accounts") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/admin/staff${query}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Page Header with Title & Description ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-fluid-3 text-text">Staff Management</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">
            {activeTab === "accounts"
              ? "Create, edit, enable, and disable staff accounts. Assign roles to control what each person can see."
              : "Executive audit report tracking staff errors, arrival reversals, and mistake frequency per agent."}
          </p>
        </div>
      </div>

      {/* ─── Switchable Tabs Header ─── */}
      <div className="flex items-center p-1 bg-surface-2/60 border border-border/80 rounded-xl max-w-fit">
        <button
          type="button"
          onClick={() => handleTabChange("accounts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "accounts"
              ? "bg-gold text-bg font-semibold shadow-sm"
              : "text-text-muted hover:text-text hover:bg-surface-2/50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts & Directory</span>
          <span
            className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === "accounts"
                ? "bg-bg/25 text-bg font-bold"
                : "bg-surface text-text-muted border border-border/60"
            }`}
          >
            {initialStaff.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("report")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "report"
              ? "bg-gold text-bg font-semibold shadow-sm"
              : "text-text-muted hover:text-text hover:bg-surface-2/50"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Staff Error & Reversal Report</span>
          <span
            className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === "report"
                ? "bg-bg/25 text-bg font-bold"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            Audit View
          </span>
        </button>
      </div>

      {/* ─── Tab Content ─── */}
      {activeTab === "accounts" ? (
        <StaffAccounts
          viewer={viewer}
          initialStaff={initialStaff}
          canManageStaff={canManageStaff}
        />
      ) : (
        <StaffErrorReport />
      )}
    </div>
  );
}
