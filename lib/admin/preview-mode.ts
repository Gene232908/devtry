// The admin dashboard's demo switch. Currently OFF — the dashboard is live.
//
// It was introduced for Milestone 2, when the private dashboard did not exist
// yet and was shown early, at 25%, purely so the layout could be walked through
// before it was implemented. Milestone 3 has since built it: inventory,
// per-sale commission, and monthly statements, with migrations 0014-0016
// applied to the live database and verified.
//
// While this flag is ON, the admin area is a DESIGN PREVIEW:
//   * every screen renders from a fixed demo dataset, never from the database
//   * nothing an admin does writes anything anywhere
//
// It is kept rather than deleted because it is still the right tool for a
// client walkthrough: turning it back on shows the full dashboard, with every
// screen populated, without putting a single real customer's name or phone
// number on a shared screen and without a demo click altering a real lead.
// `config/demo-admin-data.ts` holds that dataset.
//
// One switch — every guard in the admin and every admin write endpoint reads
// from here, so there are no scattered conditionals to hunt down.
export const ADMIN_PREVIEW = false;

/** Copy shown wherever a disabled control needs to explain itself. */
export const PREVIEW_NOTICE = "Design preview — changes are not saved.";
