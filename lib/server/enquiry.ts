import type { SupabaseClient } from "@supabase/supabase-js";

// Server-only: the single answer to "does this number already have an enquiry
// with us?", shared by the OTP gate and the abandoned-form capture so the two
// can never drift apart.

/**
 * Lead statuses that count as FINISHED, letting the same number start again.
 *
 * Both mean the conversation ended: 'deal' — the car was bought; 'closed' —
 * they met and it was not purchased. Anything else is still open, and the same
 * person is still mid-enquiry rather than starting a new one.
 */
export const REOPENABLE_STATUSES = new Set(["deal", "closed"]);

/**
 * True when this number is already a LEAD whose enquiry is still open.
 *
 * Deliberately looks at `leads` and nothing else. A `partial_leads` row is not
 * an enquiry: it is a name and a number typed into a form that was never
 * finished — nobody verified anything, and often the car was never even chosen.
 * The business cannot act on it the way it acts on a lead, so it must not be
 * treated as "we already have your details".
 *
 * A lead only exists once a code was delivered, entered correctly, AND the full
 * form submitted. That is the point at which the claim is actually true.
 *
 * Returns false when the lookup fails: neither caller should punish a customer
 * for a database hiccup.
 */
export type InquiryType = "valuation" | "scrap";

export async function hasOpenLead(
  supabase: SupabaseClient,
  phone: string,
  inquiryType: InquiryType = "valuation",
): Promise<boolean> {
  const { data, error } = await supabase
    .from("leads")
    .select("status")
    .eq("phone_e164", phone)
    .eq("inquiry_type", inquiryType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  return !REOPENABLE_STATUSES.has(data.status as string);
}
