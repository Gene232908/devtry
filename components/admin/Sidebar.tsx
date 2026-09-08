"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
 * undefined the item is visible to everyone (e.g. Settings). When it is set,
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
  { href: "/admin/inventory", label: "Inventory", icon: Car, gate: "viewInventory" },
  { href: "/admin/commission", label: "Commission", icon: Percent, gate: "viewCommissions" },
  { href: "/admin/incomplete", label: "Incomplete Forms", icon: FileClock, gate: "viewIncompleteForms" },
  { href: "/admin/blocked", label: "Blocked Numbers", icon: Ban, gate: "viewBlockedNumbers" },
  { href: "/admin/catalog", label: "Vehicle Catalog", icon: Car, gate: "viewCatalog" },
  { href: "/admin/staff", label: "Staff Accounts", icon: Users, gate: "manageStaff" },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type Props = {
  className?: string;
  /** The capabilities the current viewer holds. When omitted all items show
   *  (backwards compat with preview mode). */
  capabilities?: Capability[];
};

export function Sidebar({ className, capabilities }: Props) {
  const pathname = usePathname();

  const items = capabilities
    ? ALL_ITEMS.filter((item) => !item.gate || capabilities.includes(item.gate))
    : ALL_ITEMS;

  return (
    <aside className={cn("flex h-full w-60 flex-col gap-1 border-r border-border-gold bg-bg-elev p-4", className)}>
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-card px-3 py-2.5 text-fluid--1 transition-colors",
              active ? "bg-gold/15 text-gold" : "text-text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
