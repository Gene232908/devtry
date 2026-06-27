"use client";

import { CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { brand, whatsappLink } from "@/config/brand";

export function ThankYouModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Request received">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <CheckCircle2 className="h-14 w-14 text-success" />
        <p className="text-fluid-0 text-text">
          Thank you. Our team will contact you shortly with your valuation.
        </p>
        <div className="flex w-full flex-col gap-2.5 sm:flex-row">
          <a
            href={whatsappLink("Hi, I just submitted my car valuation request.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button className="w-full">Chat on WhatsApp now</Button>
          </a>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-fluid--1 text-text-faint">{brand.name} · {brand.address}</p>
      </div>
    </Dialog>
  );
}
