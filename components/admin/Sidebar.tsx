"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Settings,
  Ban,
  FileClock,
  Car,
  Percent,
  Users,
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
};

// Ordered to follow the car itself: leads come in, a deal turns one into stock,
// stock is sold. Inventory sits directly after Leads because that is the
// handover point between the two.
const ALL_ITEMS: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, gate: "viewDashboard" },
  { href: "/admin/leads", label: "Leads", icon: ListChecks },
  { href: "/admin/leads?origin=scrap", label: "Scrap Inquiries", icon: Car, gate: "viewScrapInquiries" },
  { href: "/admin/inventory", label: "Inventory", icon: Car, gate: "viewInventory" },
  { href: "/admin/commission", label: "Commission", icon: Percent, gate: "viewCommissions" },
  { href: "/admin/incomplete", label: "Incomplete Forms", icon: FileClock, gate: "viewIncompleteForms" },
  { href: "/admin/blocked", label: "Blocked Numbers", icon: Ban, gate: "viewBlockedNumbers" },
  { href: "/admin/catalog", label: "Vehicle Catalog", icon: Car, gate: "viewCatalog" },
  { href: "/admin/staff", label: "Staff Accounts", icon: Users, gate: "manageStaff" },
  { href: "/admin/settings", label: "Settings", icon: Settings, gate: "viewSettings" },
];

type Props = {
  className?: string;
  /** The capabilities the current viewer holds. When omitted all items show
   *  (backwards compat with preview mode). */
  capabilities?: Capability[];
  /** Callback fired when a navigation item is clicked (e.g. to close mobile drawer). */
  onNavigate?: () => void;
};

export function Sidebar({ className, capabilities, onNavigate }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isScrapRoute = pathname === "/admin/leads" && searchParams.get("origin") === "scrap";

  const items = capabilities
    ? ALL_ITEMS.filter((item) => !item.gate || capabilities.includes(item.gate))
    : ALL_ITEMS;

  return (
    <aside className={cn("flex h-full w-60 flex-col gap-1.5 border-r border-white/[0.08] bg-[#050508]/90 backdrop-blur-2xl p-4 shadow-[4px_0_24px_rgba(0,0,0,0.6)]", className)}>
      {items.map((item) => {
        const active = item.href === "/admin/leads?origin=scrap"
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
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
              active
                ? "bg-white/[0.08] text-white border border-white/[0.12] shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100 border border-transparent",
            )}
          >
            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-amber-400" : "text-zinc-400")} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
