import { Lead, LeadStatus } from "@/config/mock-data";

export type Draft = {
  status: LeadStatus;
  notes: string;
  purchasePrice: string;
  purchasedAt: string;
  inspectionScheduledAt: string;
};

/** `yyyy-mm-dd` in local time, for a native date input. */
export function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function draftFromLead(lead: Lead): Draft {
  return {
    status: lead.status,
    notes: lead.notes ?? "",
    purchasePrice: "",
    purchasedAt: todayInputValue(),
    inspectionScheduledAt: lead.inspectionScheduledAt ? lead.inspectionScheduledAt.slice(0, 16) : "",
  };
}
