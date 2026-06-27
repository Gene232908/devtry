"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Phone, Ban } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/Pill";
import { useLeads } from "@/lib/admin/leads-store";
import { mockLeadEvents, Lead, LeadStatus } from "@/config/mock-data";
import { formatDate, formatPhoneDisplay, STATUS_LABEL } from "@/lib/format";
import { whatsappLink } from "@/config/brand";

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => ({ label: STATUS_LABEL[s], value: s }));

export function LeadDetail({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();
  const [notes, setNotes] = useState(lead.notes);
  const [value, setValue] = useState(lead.estimatedValueAed != null ? String(lead.estimatedValueAed) : "");
  const events = mockLeadEvents[lead.id] ?? [
    { id: "auto", type: "lead_created", message: "Lead submitted via website valuation form.", createdAt: lead.createdAt },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/leads" className="flex items-center gap-2 text-fluid--1 text-text-muted hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-fluid-3 text-text">{lead.fullName}</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">
            {lead.id} · Submitted {formatDate(lead.createdAt)}
          </p>
        </div>
        <StatusPill status={lead.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-fluid-0 text-text">Vehicle</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-fluid--1 sm:grid-cols-4">
              <Detail label="Make" value={lead.make} />
              <Detail label="Model" value={lead.model} />
              <Detail label="Year" value={String(lead.year)} />
              <Detail label="Mileage" value={`${lead.mileageKm.toLocaleString()} km`} />
              <Detail label="Condition" value={lead.condition.charAt(0).toUpperCase() + lead.condition.slice(1)} />
              <Detail label="Phone" value={formatPhoneDisplay(lead.phoneE164)} />
              <Detail label="Email" value={lead.email || "—"} />
              <Detail label="Source" value="Web" />
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-fluid-0 text-text">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => updateLead(lead.id, { notes })}
              rows={4}
              placeholder="Internal notes about this lead…"
              className="w-full rounded-card border border-border bg-surface-2 p-3 text-fluid-0 text-text outline-none focus:gold-glow focus:border-gold"
            />
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-fluid-0 text-text">Activity</h3>
            <ul className="flex flex-col gap-3">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-fluid--1">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p className="text-text">{ev.message}</p>
                    <p className="text-text-faint">{formatDate(ev.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-fluid-0 text-text">Contact customer</h3>
            <a
              href={whatsappLink(
                `Hi ${lead.fullName.split(" ")[0]}, regarding your ${lead.year} ${lead.make} ${lead.model} valuation with CarVibe Dubai…`,
                lead.phoneE164,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full">
                <MessageCircle className="h-4 w-4" /> Message on WhatsApp
              </Button>
            </a>
            <a href={`tel:${lead.phoneE164}`}>
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4" /> Call {formatPhoneDisplay(lead.phoneE164)}
              </Button>
            </a>
            <p className="text-fluid--1 text-text-faint">
              WhatsApp opens the chat pre-filled — use the call icon inside WhatsApp for a voice/video call.
            </p>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-fluid-0 text-text">Status &amp; value</h3>
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={lead.status}
              onChange={(v) => updateLead(lead.id, { status: v as LeadStatus })}
            />
            <Input
              label="Estimated Value (AED)"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => updateLead(lead.id, { estimatedValueAed: value ? Number(value) : null })}
              placeholder="e.g. 185000"
            />
            <Button
              variant="outline"
              className="w-full text-danger hover:bg-danger/10"
              onClick={() => updateLead(lead.id, { status: "closed", notes: `${notes}\nMarked as spam / blocked.`.trim() })}
            >
              <Ban className="h-4 w-4" /> Mark as spam
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-text-faint">{label}</p>
      <p className="mt-0.5 break-words text-text">{value}</p>
    </div>
  );
}
