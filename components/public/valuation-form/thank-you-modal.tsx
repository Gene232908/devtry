"use client";

import { CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";

export function ThankYouModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Request received">
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success/25 animate-ping-ring motion-reduce:hidden" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success/15 animate-fade-in">
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          </span>
        </span>
        <p className="animate-fade-in text-fluid-1 font-light leading-8 text-text">
          Thank you! Our team will contact you shortly.
        </p>
        <div className="flex w-full">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-gold">{brand.name}</p>
      </div>
    </Dialog>
  );
}
