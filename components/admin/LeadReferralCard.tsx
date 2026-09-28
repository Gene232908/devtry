"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Gift, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Referral = {
  type: "employee" | "client";
  employee: { name: string; role: string } | null;
  clientName: string | null;
  proofNote: string;
  proofUrl: string;
};

export function LeadReferralCard({ leadId }: { leadId: string }) {
  const [referral, setReferral] = useState<Referral | null>(null);
  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/referral`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (active) setReferral(body?.data?.referral ?? null); })
      .catch(() => { if (active) setReferral(null); });
    return () => { active = false; };
  }, [leadId]);
  if (!referral) return null;
  const employeeReferral = referral.type === "employee";
  const name = employeeReferral ? referral.employee?.name ?? "Staff member" : referral.clientName ?? "Client";
  return (
    <Card className={employeeReferral ? "border-gold/45 p-5" : "p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${employeeReferral ? "bg-gold/15 text-gold" : "bg-surface-2 text-text-muted"}`}>
            {employeeReferral ? <Gift className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </div>
          <div>
            <p className="font-medium text-text">{employeeReferral ? "Employee referral" : "Client referral"}</p>
            <p className="mt-1 text-sm text-text-muted">Referred by <span className="text-text">{name}</span>{employeeReferral && referral.employee ? ` (${referral.employee.role})` : ""}.</p>
          </div>
        </div>
        <a href={referral.proofUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-btn border border-border-gold/60 px-3 text-sm text-text hover:border-gold hover:text-gold">
          <ExternalLink className="h-3.5 w-3.5" /> View proof
        </a>
      </div>
      <p className="mt-4 rounded-card bg-surface-2/70 p-3 text-sm leading-6 text-text-muted">{referral.proofNote}</p>
      <p className="mt-3 text-xs text-text-faint">Referral proof is kept for context. A sale does not create an automatic referral payout; the company decides any future award separately.</p>
    </Card>
  );
}
