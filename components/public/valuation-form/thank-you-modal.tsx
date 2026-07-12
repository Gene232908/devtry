"use client";

import { CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";

export function ThankYouModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Request received">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <CheckCircle2 className="h-14 w-14 text-success" />
        <p className="text-fluid-0 text-text">
          Thank you! Your request has been received. Our team will contact you shortly on WhatsApp with your car&apos;s valuation.
        </p>
        <div className="flex w-full">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-fluid--1 text-text-faint">{brand.name} / {brand.address}</p>
      </div>
    </Dialog>
  );
}
