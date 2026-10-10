"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Settings,
  Ban,
  FileClock,
  CarFront,
  Recycle,
  Percent,
  Users,
  Database,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Capability } from "@/lib/auth/permissions";

/**
 * Each sidebar item is gated by an optional capability. When the capability is
 * undefined the item is visible to everyone. When it is set,
 * the item only renders if the viewer holds that capability.
 */
type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** If set, the item is only visible when the viewer has this capability. */
  gate?: Capability;
  badge?: string;
  badgeTone?: "gold" | "blue";
};

const NAV_ITEMS: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, gate: "viewDashboard" },
  { href: "/admin/leads", label: "Leads", icon: ListChecks },
  {
    href: "/admin/leads?origin=scrap",
    label: "Scrap Inquiries",
    icon: Recycle,
    gate: "viewScrapInquiries",
    badge: "Scrap",
  },
  { href: "/admin/inventory", label: "Inventory", icon: CarFront, gate: "viewInventory" },
  { href: "/admin/commission", label: "Commission", icon: Percent, gate: "viewCommissions" },
  { href: "/admin/staff", label: "Staff Accounts", icon: Users, gate: "manageStaff" },
  { href: "/admin/incomplete", label: "Incomplete Forms", icon: FileClock, gate: "viewIncompleteForms" },
  { href: "/admin/catalog", label: "Vehicle Catalog", icon: Database, gate: "viewCatalog" },
  { href: "/admin/blocked", label: "Blocked Numbers", icon: Ban, gate: "viewBlockedNumbers" },
  { href: "/admin/settings", label: "Settings", icon: Settings, gate: "viewSettings" },
];

type Props = {
  className?: string;
  /** The capabilities the current viewer holds. When omitted all items show
   *  (backwards compat with preview mode). */
  capabilities?: Capability[];
  /** Callback fired when a navigation item is clicked (e.g. to close mobile drawer). */
  onNavigate?: () => void;
  isMobile?: boolean;
};

export function Sidebar({ className, capabilities, onNavigate, isMobile }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isScrapRoute = pathname === "/admin/leads" && searchParams.get("origin") === "scrap";

  const items = capabilities
    ? NAV_ITEMS.filter((item) => !item.gate || capabilities.includes(item.gate))
    : NAV_ITEMS;

  return (
    <aside
      className={cn(
        "flex w-72 shrink-0 flex-col border-r border-white/[0.08] bg-[#09090d]/95 backdrop-blur-2xl px-3.5 py-4 shadow-[4px_0_24px_rgba(0,0,0,0.5)] select-none overflow-y-auto",
        "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent",
        className,
      )}
    >
      {/* Mobile Drawer Header with Close Button */}
      {isMobile && (
        <div className="mb-2 flex items-center justify-between border-b border-white/[0.08] pb-3 pt-1 px-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Navigation</span>
          <button
            type="button"
            onClick={() => onNavigate?.()}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Items (Crisp, Refined Modern Spacing) */}
      <nav className="flex flex-col gap-1.5 pt-1">
        {items.map((item) => {
          const active =
            item.href === "/admin/leads?origin=scrap"
              ? isScrapRoute
              : item.href === "/admin/leads"
                ? pathname === "/admin/leads" && !isScrapRoute
                : pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-150",
                active
                  ? "bg-amber-400/10 text-white font-semibold border border-amber-400/25 shadow-[0_2px_12px_rgba(245,158,11,0.15)]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100 border border-transparent",
              )}
            >
              {/* Left Active Glow Indicator */}
              {active && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
              )}

              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active
                    ? item.badgeTone === "gold" || item.href.includes("scrap")
                      ? "text-gold"
                      : "text-amber-400"
                    : "text-zinc-400 group-hover:text-zinc-200",
                )}
              />

              <span className="whitespace-nowrap">{item.label}</span>

              {/* Micro Pill Badge (e.g. Scrap) */}
              {item.badge && (
                <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gold/15 text-gold border border-gold/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Modern Status Footer */}
      <div className="mt-auto pt-4 border-t border-white/[0.06] px-2 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-medium text-zinc-300 text-[11px]">CarVibe Live</span>
        </div>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-white/5">
          UAE
        </span>
      </div>
    </aside>
  );
}
