"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, ChevronDown } from "lucide-react";
import { StatusPill } from "@/components/ui/Pill";
import { Lead, LeadStatus } from "@/config/mock-data";
import { formatAed, formatDate, formatPhoneDisplay, STATUS_LABEL } from "@/lib/format";
import { whatsappLink } from "@/config/brand";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: LeadStatus[] = ["new", "pending", "contacted", "valuation_sent", "closed"];

export function LeadRow({ lead, onStatusChange }: { lead: Lead; onStatusChange: (status: LeadStatus) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-2/50">
      <td className="py-3 pr-4">
        <Link href={`/admin/leads/${lead.id}`} className="text-text hover:text-gold">
          {lead.fullName}
        </Link>
        {lead.isDuplicate && (
          <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
            repeat
          </span>
        )}
      </td>
      <td className="py-3 pr-4 text-text-muted">{formatPhoneDisplay(lead.phoneE164)}</td>
      <td className="py-3 pr-4 text-text-muted">
        {lead.year} {lead.make} {lead.model}
      </td>
      <td className="py-3 pr-4 text-text-muted">{lead.mileageKm.toLocaleString()} km</td>
      <td className="py-3 pr-4 text-text-muted">{formatDate(lead.createdAt)}</td>
      <td className="py-3 pr-4 text-text-muted">{formatAed(lead.estimatedValueAed)}</td>
      <td className="py-3 pr-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5"
          >
            <StatusPill status={lead.status} />
            <ChevronDown className="h-3.5 w-3.5 text-text-faint" />
          </button>
          {open && (
            <ul className="absolute z-20 mt-1 w-44 rounded-card border border-border-gold bg-surface-2 py-1 card-shadow animate-fade-in">
              {STATUS_OPTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(s);
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-fluid--1 hover:bg-surface",
                      s === lead.status ? "text-gold" : "text-text",
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </td>
      <td className="py-3 pl-2 pr-1 text-right">
        <a
          href={whatsappLink(
            `Hi ${lead.fullName.split(" ")[0]}, regarding your ${lead.year} ${lead.make} ${lead.model} valuation with CarVibe Dubai…`,
            lead.phoneE164,
          )}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${lead.fullName}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-success hover:bg-success/15"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      </td>
    </tr>
  );
}
