"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Phone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatPhoneDisplay } from "@/lib/format";
import { whatsappLink } from "@/config/brand";

type Props = {
  fullName: string;
  phoneE164: string | null;
  carSummary?: string;
};

export function LeadContactCard({ fullName, phoneE164, carSummary }: Props) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const copyPhone = useCallback(() => {
    if (!phoneE164) return;
    void navigator.clipboard.writeText(phoneE164);
    setCopiedPhone(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedPhone(false), 2000);
  }, [phoneE164]);

  const firstName = fullName ? fullName.split(" ")[0] : "";
  const waMessage = carSummary
    ? `Hi ${firstName}, regarding your ${carSummary} valuation with CarVibe Dubai…`
    : `Hi ${firstName}, regarding your car valuation with CarVibe Dubai…`;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text">Customer Contact</h3>
        {phoneE164 && (
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Phone Available
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-border bg-surface-2/50 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Direct Phone</p>
          <p className="mt-1 text-base font-semibold text-text tracking-wide">
            {phoneE164 ? formatPhoneDisplay(phoneE164) : "—"}
          </p>
        </div>
        {phoneE164 && (
          <button
            type="button"
            onClick={copyPhone}
            className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-card px-3 py-1.5 text-xs font-medium border border-border bg-surface-1 text-text hover:text-gold hover:border-gold/50 transition-colors"
          >
            {copiedPhone ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy number</span>
              </>
            )}
          </button>
        )}
      </div>

      {phoneE164 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href={whatsappLink(waMessage, phoneE164)} target="_blank" rel="noopener noreferrer">
            <Button className="w-full">
              <MessageCircle className="h-4 w-4" /> Message on WhatsApp
            </Button>
          </a>
          <a href={`tel:${phoneE164}`}>
            <Button variant="outline" className="w-full">
              <Phone className="h-4 w-4" /> Call Customer
            </Button>
          </a>
        </div>
      )}
    </Card>
  );
}
