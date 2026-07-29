// MILESTONE 2 BRANCH ONLY — do not merge this file into main as-is.
//
// Milestone 2 covers the customer form, phone verification, and lead storage.
// The private dashboard is Milestone 3 and is not built yet; it is being shown
// early, at 25%, purely so the layout and page structure can be walked through
// and discussed before it is implemented.
//
// While this flag is on, the admin area is a DESIGN PREVIEW:
//   * every screen renders from a fixed demo dataset, never from the database
//   * nothing an admin does writes anything anywhere
//
// Both halves matter. Reading live data would put real customer details on a
// screen whose access rules are not finished, and writing would let a
// walkthrough click permanently change a real lead — or block a real customer's
// phone number — while discussing a page that does not exist yet.
//
// The public side is unaffected: the valuation form, OTP verification, and lead
// storage are Milestone 2 deliverables and run fully live against Supabase.
//
// To turn this off (once Milestone 3 begins), set it to false — every guard in
// the admin reads from here, so there is a single switch and no scattered
// conditionals to hunt down.
export const ADMIN_PREVIEW = true;

/** Copy shown wherever a disabled control needs to explain itself. */
export const PREVIEW_NOTICE = "Design preview — changes are not saved.";
