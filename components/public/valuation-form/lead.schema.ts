import { z } from "zod";

export const leadSchema = z.object({
  make: z.string().min(1, "Select a make"),
  model: z.string().min(1, "Select a model"),
  year: z.string().min(1, "Select a year"),
  mileageKm: z
    .string()
    .min(1, "Enter valid mileage")
    .refine((v) => Number(v) >= 0 && Number(v) <= 1_000_000, "Enter valid mileage"),
  condition: z.enum(["excellent", "good", "fair"], { message: "Choose a condition" }),
  fullName: z
    .string()
    .min(2, "Enter your name")
    .max(60, "Enter your name")
    .regex(/^[a-zA-Z\s.'-]+$/, "Enter your name"),
  whatsapp: z
    .string()
    .regex(/^\+971\d{9}$/, "Enter a valid UAE number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  consent: z.literal(true, { message: "Please agree to be contacted" }),
});

export type LeadSchema = z.infer<typeof leadSchema>;
