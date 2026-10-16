"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronDown, Menu, UserPlus } from "lucide-react";
import { Logo } from "@/components/public/Logo";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { ROLE_LABELS, type StaffIdentity } from "@/lib/auth/permissions";
import { useLeads } from "@/lib/admin/leads-store";
import { ManualLeadDialog } from "@/components/admin/ManualLeadDialog";
import { cn } from "@/lib/utils";

type Props = {
  onMenuClick?: () => void;
  identity?: StaffIdentity | null;
};

export function Topbar({ onMenuClick, identity }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const { refresh } = useLeads();

  const displayName = identity?.displayName ?? "Admin";
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = identity ? (ROLE_LABELS[identity.role] ?? identity.role) : "";

  const canCreateLead =
    identity?.role === "admin" ||
    identity?.role === "manager" ||
    identity?.role === "call_center" ||
    !identity;

  async function handleSignOut() {
    try {
      await getSupabaseBrowser().auth.signOut();
    } catch {
      // best-effort; still redirect away from the admin area either way
    }
    router.replace("/admin/login");
    router.refresh();
  }

  const headerTitle = identity
    ? identity.role === "call_center"
      ? "Call Center Agent"
      : identity.role === "purchaser"
      ? "Purchaser"
      : "Super Admin"
    : "Admin";

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-white/[0.08] bg-black/85 backdrop-blur-2xl backdrop-saturate-150 px-4 sm:px-6 shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
      {/* Subtle top frosted ice hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100 lg:hidden transition-colors"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="transition-opacity hover:opacity-90">
          {/* "sm" keeps the mark inside the 4rem header instead of overlapping it. */}
          <Logo size="sm" />
        </Link>
        <span className="hidden items-center text-xs font-medium tracking-wide text-zinc-400 sm:inline-flex border-l border-white/10 pl-3">
          {headerTitle}
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Prominent, Eye-Catching Add Lead CTA for Super Admin & Customer Service */}
        {canCreateLead && (
          <button
            type="button"
            onClick={() => setAddLeadOpen(true)}
            className="group relative inline-flex items-center gap-1.5 sm:gap-2 overflow-hidden rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(245,158,11,0.55)] active:scale-[0.98] border border-amber-300/60"
            title="Create a new walk-in or manual customer lead"
          >
            <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5] text-zinc-950 transition-transform group-hover:scale-110" />
            <span className="tracking-wide"><span className="hidden xs:inline">Add </span>Lead</span>
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="group flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 font-display text-xs font-semibold text-amber-300 shadow-inner">
              {initial}
            </span>
            <span className="hidden flex-col items-start sm:flex text-left">
              <span className="leading-tight font-medium text-zinc-100 group-hover:text-white transition-colors">{displayName}</span>
              {roleLabel && (
                <span className="text-[0.65rem] leading-tight text-zinc-400">{roleLabel}</span>
              )}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform duration-200", menuOpen && "rotate-180")} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-white/[0.12] bg-[#050508]/95 backdrop-blur-2xl py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.9)] animate-fade-in">
              <div className="px-4 py-2 border-b border-white/[0.06] sm:hidden">
                <p className="text-xs font-medium text-white">{displayName}</p>
                {roleLabel && <p className="text-[0.65rem] text-zinc-400">{roleLabel}</p>}
              </div>
              {identity?.capabilities.includes("viewSettings") && (
                <Link
                  href="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  Profile Settings
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 border-t border-white/[0.06] px-4 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors mt-1"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <ManualLeadDialog
        open={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        onCreated={async () => {
          await refresh();
        }}
      />
    </header>
  );
}
