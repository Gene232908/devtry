import { z } from "zod";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";

export const MANUAL_LEAD_SOURCES = ["walk_in", "phone_call", "whatsapp", "other"] as const;
export const REFERRAL_TYPES = ["none", "employee", "client"] as const;

export const MANUAL_LEAD_SOURCE_LABELS: Record<(typeof MANUAL_LEAD_SOURCES)[number], string> = {
  walk_in: "Walk-in",
  phone_call: "Phone call",
  whatsapp: "WhatsApp / message",
  other: "Other",
};

const currentYear = new Date().getFullYear();

export const manualLeadSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the customer's name").max(80, "Keep the name under 80 characters"),
  phone: z.string().trim().refine((value) => normalizeWhatsappPhone(value) !== null, "Enter a valid UAE or approved test number"),
  source: z.enum(MANUAL_LEAD_SOURCES, { message: "Select how the customer contacted CarVibeDubai" }),
  sourceNote: z.string().trim().max(120, "Keep the source note under 120 characters").optional().or(z.literal("")),
  referralType: z.enum(REFERRAL_TYPES),
  referrerStaffId: z.string().uuid().optional().or(z.literal("")),
  referrerClientName: z.string().trim().max(80, "Keep the name under 80 characters").optional().or(z.literal("")),
  referralProofNote: z.string().trim().max(1200, "Keep the proof details under 1,200 characters").optional().or(z.literal("")),
  inspectionScheduledAt: z.string().optional().or(z.literal("")),
  make: z.string().trim().min(1, "Select a make"),
  model: z.string().trim().min(1, "Select a model"),
  trim: z.string().trim().min(1, "Select a trim"),
  year: z.coerce.number().int().min(1980, "Enter a valid year").max(currentYear + 1, "Enter a valid year"),
  mileageKm: z.coerce.number().int().min(0, "Mileage cannot be negative").max(1_000_000, "Enter valid mileage"),
  specification: z.string().trim().min(1, "Select a specification"),
  optionLevel: z.enum(["Basic Mode", "Mid Mode", "Full Option"], { message: "Select an option level" }),
  emirate: z.string().trim().min(1, "Select an emirate"),
  notes: z.string().trim().max(1000, "Keep notes under 1,000 characters").optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.referralType === "employee" && !value.referrerStaffId) {
    context.addIssue({ code: "custom", path: ["referrerStaffId"], message: "Select the employee who referred the customer" });
  }
  if (value.referralType === "client" && !value.referrerClientName) {
    context.addIssue({ code: "custom", path: ["referrerClientName"], message: "Enter the client referrer's name" });
  }
  if (value.referralType !== "none" && !value.referralProofNote) {
    context.addIssue({ code: "custom", path: ["referralProofNote"], message: "Explain the referral proof" });
  }
  if (value.inspectionScheduledAt) {
    if (Number.isNaN(new Date(value.inspectionScheduledAt).getTime())) {
      context.addIssue({ code: "custom", path: ["inspectionScheduledAt"], message: "Choose a valid inspection date and time" });
    }
  }
});

export type ManualLeadInput = z.infer<typeof manualLeadSchema>;
