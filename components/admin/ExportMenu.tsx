"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ExportMenu({ onPdf, onExcel }: { onPdf: () => void | Promise<void>; onExcel: () => void; }) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <Download className="h-4 w-4" /> Export
    </Button>
    {open && <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-card border border-border bg-surface p-1 shadow-lg">
      <button className="block w-full rounded px-3 py-2 text-left text-sm text-text hover:bg-surface-2" onClick={() => { setOpen(false); void onPdf(); }}>PDF</button>
      <button className="block w-full rounded px-3 py-2 text-left text-sm text-text hover:bg-surface-2" onClick={() => { setOpen(false); onExcel(); }}>Excel</button>
    </div>}
  </div>;
}
