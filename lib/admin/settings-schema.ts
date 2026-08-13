import { z } from "zod";

/**
 * The shape of the business settings, and the single source of truth for what
 * counts as valid.
 *
 * Shared by the client (to disable Save and show field errors) and the route
 * (to actually enforce it). The client copy is a convenience; the route's is
 * the one that decides, because a form is not a security boundary.
 */

/**
 * UAE numbers are entered as +9715XXXXXXXX. Kept deliberately loose beyond the
 * country code — these feed `wa.me` and `tel:` links, and rejecting a valid
 * landline or a new mobile prefix would make the field unusable for the sake of
 * a guess about numbering plans.
 */
const phone = z
  .string()
  .trim()
  .min(1, "Required.")
  .regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +971564145781.");

// `buy_a_car_enabled` is deliberately absent.
//
// The column exists (migration 0001) and a checkbox for it briefly appeared on
// this screen, but nothing anywhere reads it: the "Buy a Car — Coming Soon"
// button on the public site is hard-coded in config/copy.ts and Navbar.tsx, and
// consults neither this column nor `features.buyACar`. Ticking the box saved a
// value that changed nothing on the site — a control that lies about having an
// effect, which is the same failure as the fake save this screen was fixed for.
//
// The column is left in place for the marketplace it was planned for. When that
// is built, add the field back here AND wire the public site to read it.
export const settingsSchema = z.object({
  whatsappNumber: phone,
  callNumber: phone,
  // Optional: notifications can be switched off entirely, and an empty box is
  // how that is expressed.
  notifyEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export type Settings = SettingsInput & {
  /** Read-only here — set by migrations/seed, not editable on this screen. */
  visibleStats: string[];
};

export type Manager = {
  id: string;
  email: string;
  role: string;
  displayName?: string;
};

/** First error per field, keyed by field name, for rendering under inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out;
}
