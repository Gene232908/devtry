"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronDown, Menu } from "lucide-react";
import { Logo } from "@/components/public/Logo";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { ROLE_LABELS, type StaffIdentity } from "@/lib/auth/permissions";

type Props = {
  onMenuClick?: () => void;
  identity?: StaffIdentity | null;
};

export function Topbar({ onMenuClick, identity }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = identity?.displayName ?? "Admin";
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = identity ? (ROLE_LABELS[identity.role] ?? identity.role) : "";

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
    <header className="flex h-16 items-center justify-between border-b border-border-gold bg-bg-elev px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button type="button" className="p-1.5 text-text lg:hidden" onClick={onMenuClick} aria-label="Toggle sidebar">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin">
          {/* "sm" keeps the mark inside the 4rem header instead of overlapping it. */}
          <Logo size="sm" />
        </Link>
        <span className="hidden text-fluid--1 text-text-faint sm:inline">| {headerTitle}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-card px-2 py-1.5 text-fluid--1 text-text hover:bg-surface-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 font-display text-gold">
              {initial}
            </span>
            <span className="hidden flex-col items-start sm:flex">
              <span className="leading-tight">{displayName}</span>
              {roleLabel && (
                <span className="text-[0.65rem] leading-tight text-text-faint">{roleLabel}</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-card border border-border-gold bg-surface py-1 card-shadow animate-fade-in">
              <Link href="/admin/settings" className="block px-4 py-2 text-fluid--1 text-text hover:bg-surface-2">
                Profile
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-fluid--1 text-text hover:bg-surface-2"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
