"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { LeadsProvider } from "@/lib/admin/leads-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <LeadsProvider>
      <div className="flex h-screen flex-col bg-bg">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar className="hidden lg:flex" />

          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-40 flex lg:hidden">
              <Sidebar className="flex" />
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex-1 bg-black/60"
              >
                <X className="m-4 h-6 w-6 text-text" />
              </button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </LeadsProvider>
  );
}
