import { z } from "zod";

const UAE_MOBILE_PATTERNS = [/^05\d{8}$/, /^9715\d{8}$/];

export function isValidUaeMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return UAE_MOBILE_PATTERNS.some((pattern) => pattern.test(digits));
}

export const leadSchema = z.object({
  make: z.string().min(1, "Select a make"),
  model: z.string().min(1, "Select a model"),
  year: z.string().min(1, "Select a year"),
  mileageKm: z
    .string()
    .min(1, "Enter valid mileage")
    .refine((v) => Number(v) >= 0 && Number(v) <= 1_000_000, "Enter valid mileage"),
  condition: z.enum(["excellent", "good", "fair"], { message: "Choose a condition" }),
  emirate: z.string().min(1, "Choose an inspection area"),
  fullName: z
    .string()
    .min(2, "Enter your name")
    .max(60, "Enter your name")
    .regex(/^[a-zA-Z\s.'-]+$/, "Enter your name"),
  whatsapp: z
    .string()
    .refine(isValidUaeMobileNumber, "Use 0564145781 or +971564145781"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  consent: z.literal(true, { message: "Please agree to be contacted" }),
});

export type LeadSchema = z.infer<typeof leadSchema>;
