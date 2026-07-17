import { z } from "zod";

const UAE_MOBILE_PATTERNS = [/^05\d{8}$/, /^9715\d{8}$/];

export function isValidUaeMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return UAE_MOBILE_PATTERNS.some((pattern) => pattern.test(digits));
}

/** Normalizes a UAE mobile number (05..., 9715..., or +9715...) to E.164 (+9715...). */
export function normalizeUaeMobile(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^05\d{8}$/.test(digits)) return `+971${digits.slice(1)}`;
  if (/^9715\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

export const leadSchema = z.object({
  make: z.string().min(1, "Select a make"),
  model: z.string().min(1, "Select a model"),
  year: z.string().min(1, "Select a year"),
  mileageKm: z
    .string()
    .min(1, "Enter valid mileage")
    .refine((v) => Number(v) >= 0 && Number(v) <= 1_000_000, "Enter valid mileage"),
  description: z.string().max(400, "Keep it under 400 characters").optional().or(z.literal("")),
  trim: z.string().min(1, "Select a trim"),
  optionLevel: z.enum(["Basic Mode", "Mid Mode", "Full Option"], { message: "Choose an option level" }),
  location: z.string().min(1, "Choose your location"),
  fullName: z
    .string()
    .min(2, "Enter your name")
    .max(60, "Enter your name")
    .regex(/^[a-zA-Z\s.'-]+$/, "Enter your name"),
  whatsapp: z
    .string()
    .refine(isValidUaeMobileNumber, "Use 0501234567 or +971501234567"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  consent: z.literal(true, { message: "Please agree to be contacted" }),
});

export type LeadSchema = z.infer<typeof leadSchema>;
