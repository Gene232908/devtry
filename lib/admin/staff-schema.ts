import { z } from "zod";
import type { StaffRole } from "@/lib/auth/permissions";

/**
 * lib/admin/staff-schema.ts
 *
 * DTO types and Zod schema for the Staff Accounts feature.
 *
 * Shared between client (form validation) and server (route validation).
 * The server copy is the one that decides — client validation is convenience
 * only.
 */

/** The safe public summary returned by GET /api/admin/staff. */
export type StaffSummary = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
};

/**
 * Roles that may be assigned to a staff account.
 * 'admin' (Super Admin) accounts are not created through this form —
 * they are provisioned directly in Supabase Auth.
 */
export const ASSIGNABLE_ROLES: StaffRole[] = ["call_center", "purchaser"];

export const ASSIGNABLE_ROLE_VALUES = ["call_center", "purchaser"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLE_VALUES)[number];

/**
 * Schema for creating or updating a staff account.
 * Used on both client (pre-submit guard) and server (route validation).
 */
export const staffDraftSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  displayName: z
    .string()
    .trim()
    .min(2, "Enter a display name (at least 2 characters).")
    .max(80, "Display name is too long."),
  role: z.enum(ASSIGNABLE_ROLE_VALUES, {
    message: "Select a valid role.",
  }),
});

export type StaffDraft = z.infer<typeof staffDraftSchema>;

/**
 * Schema for PATCH /api/admin/staff/[id].
 * All fields are optional — a PATCH may update any subset.
 */
export const staffPatchSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter a display name (at least 2 characters).")
    .max(80, "Display name is too long.")
    .optional(),
  role: z.enum(ASSIGNABLE_ROLE_VALUES, { message: "Select a valid role." }).optional(),
  isActive: z.boolean().optional(),
});

export type StaffPatch = z.infer<typeof staffPatchSchema>;

/** First error per field, keyed by field name. */
export function staffFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out;
}
