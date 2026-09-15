# TASKS.md

## Current objective

- [x] 2026-09-15 Manual Lead Modal Overlap & Pinned Layout Hardening:
  - Fixed top overlap and cut-off on Add Lead modal (`ManualLeadDialog`) caused by flexbox negative margin clipping and sticky header stacking context.
  - Implemented React `createPortal(..., document.body)` in `Dialog.tsx` so modals teleport directly to `document.body`, escaping any ancestor CSS `backdrop-filter` or containing blocks.
  - Replaced rigid flex `items-center` with scrollable overlay (`overflow-y-auto`) and self-centering `my-auto` on the dialog card, eliminating negative coordinate data-loss.
  - Structured `ManualLeadDialog` with a **pinned Header** (title, subtitle, and Close "X" button always visible), **scrollable Body** (`flex-1 overflow-y-auto px-6 py-5` with form starting at top), and **pinned Footer** (`Cancel` and `Create lead` buttons always anchored at bottom).
  - Removed redundant lead count pill badge ("72 leads") from the Leads Directory toolbar (`toolbar.tsx`) per user request.
  - Verified live in browser across laptop (1366x768) and mobile (390x844): zero clipping at top, smooth internal scrolling, and verified `tsc --noEmit`, `npm test` (222/222 passed), `npm run lint`.

- [x] 2026-09-15 Multi-Tab Responsive Hardening & Cross-Device Screen Verification:
  - Audited and verified all admin tabs and screens across mobile (390x844), tablet (768x1024), laptop (1366x768), and desktop XL (1920x1080).
  - Resolved Commission table action button collision by increasing minimum table width to 820px, expanding the actions column to 28%, and adding `whitespace-nowrap`.
  - Hardened Inventory filters with `sm:flex-wrap` and table cell figures with `whitespace-nowrap` to prevent multiline wrapping and horizontal overcrowding.
  - Hardened Blocked Numbers tables (OTP limits & blocked records) with `min-w-[760px]`, `whitespace-nowrap` figures, and aligned action buttons.
  - Added mobile sidebar auto-dismiss (`onNavigate`) in `Sidebar.tsx` / `AdminShell.tsx` so clicking any nav link instantly closes the mobile drawer.
  - Verified Lead Detail, Staff Accounts, Settings, and Catalog pages on all viewports, ensuring zero button overlaps, zero text collisions, and zero regressions across all 222 tests.

- [x] 2026-09-15 Leads Directory Responsiveness, Topbar Add Lead CTA & Logo Emblem Enhancement:
  - Added streamlined mobile view (`MobileLeadsList`) that prioritizes the Client Name and essential metadata without crowded 9-column horizontal scrolling on small screens (`block md:hidden`). Full 9-column table reserved for laptops and desktop (`hidden md:block`).
  - Relocated "+ Add Lead" action from the table toolbar directly into the top navigation bar (`Topbar.tsx`) next to the profile menu, styled with an illuminated gold gradient CTA for Super Admin and Call Centre roles.
  - Organized table toolbar into a 2-tier responsive layout with search/metrics/export in Tier 1 and multi-select filter dropdowns in Tier 2, preventing horizontal crowding on laptop screens (1024px–1440px / 1366x768).
  - Fixed table columns with `whitespace-nowrap`, `tabular-nums`, and balanced minimum widths to eliminate awkward multi-line text wrapping (`20,000 km`, `14 Sept 2026`, `Not yet arrived`).
  - Enhanced circular logo badge with isolated high-contrast transparent gold emblem (`logo-mark.png`), eliminating microscopic duplicate text and guaranteeing crisp visibility across all viewports.
  - Verified: `npx tsc --noEmit` (0 errors), `npm test` (26/26 test files passed, 222/222 tests), `npm run lint` (0 warnings, 0 errors), and visual browser verification across mobile (390x844) and laptop (1366x768).

- [x] 2026-09-14 Staff Manual Lead Creation:
  - Added authenticated manual lead entry for Super Admin and Call Centre roles,
    with Walk-in, Phone call, WhatsApp/message, and Other intake sources.
  - Added server-derived creator attribution, duplicate review flags, existing
    Call Centre routing, source visibility, and export support.
  - Added optional inspection scheduling, No Show handling, employee referral
    proof, frozen sold-time incentive amounts, and combined monthly commission
    invoice support.
  - Apply migrations `0030_manual_leads.sql`, `0031_referral_incentives.sql`,
    and `0032_no_show_status.sql` before live use.

- [x] 2026-09-13 Customer Service Arrival Confirmation & Multi-View Visibility:
  - Enabled Call Centre staff, Super Admin, and Manager accounts to record customer arrival across stages `["inspection_scheduled", "inspected", "negotiating", "deal"]` in `LeadDetail.tsx` and `route.ts`.
  - Added visible arrival indicators across the platform: header badge (`✓ Customer Arrived`), Scheduled Inspection card badge and updated message, dedicated Purchaser arrival card, inspection workspace header badge, and Leads Directory table column.
  - Modularized `LeadArrivalCard.tsx`, `LeadScheduledInspectionCard.tsx`, and `LeadPurchaseFields.tsx` ensuring `LeadDetail.tsx` remains strictly under 500 lines (497 lines).
  - Marked lead GENEEEE (`eaf3892f-b874-44d1-bd83-7e5c1fe6b6a4`) as Arrived in database with `arrival_confirmed` event by Agent1.
- [x] 2026-09-13 Incomplete Forms Specification Editing & Pipeline Status Clean-up:
  - Added manual vehicle specification selection to Incomplete Forms workspace (`PartialLeadDetail.tsx`) for Customer Service and added display to `PartialLeadCapturedCard.tsx`.
  - Added persistence for `specification` in `PATCH /api/admin/partial-leads/[id]` with graceful fallback.
  - Aligned active pipeline statuses by removing obsolete `pending` and `closed` ("Not Purchased") from active filters and menus across `LEAD_PIPELINE`, `DETAIL_STATUS_OPTIONS`, `FILTER_STATUS_OPTIONS`, `AGENT_STATUS_CHOICES`, and `PARTIAL_STATUSES`.
  - Hardened specification validation in `app/api/leads/route.ts` and `app/api/admin/partial-leads/[id]/route.ts` with standard fallback names, and retained fallback options in `lib/use-vehicle-catalog.ts` so forms do not break when catalog is empty.
  - Enabled Super Admin and Manager accounts to confirm customer arrival.
  - Preserved Philippine testing number support (`PH_MOBILE_PATTERNS`) per client instruction.
  - Verified: `npx tsc --noEmit` (0 errors), `vitest` (206 tests passing), `eslint` (clean), `npm run build:check` (clean).

- [x] 2026-09-09 Dashboard UI/UX & Chart Visibility Overhaul:
  - Fixed single-color gold ambiguity with intuitive multi-color systems: progressive chromatic 8-stage funnel with conversion percentages, operational urgency inventory aging colors (Emerald -> Sky -> Amber -> Red), and tri-color staff performance.
  - Implemented Dual Y-Axis and prominent Gross Profit visualization so profit values (e.g. AED 1,500) are never dwarfed by high revenue (AED 20,000), plus added a Gross Margin % badge.
  - Fixed "Today only" single-point views across charts: bounded bars (`maxBarSize={48-52}`) and executive single-day comparative cards for revenue & profit.
  - Enhanced KPI cards with luxury glowing icon avatars, accent borders, and margin tags.
  - All automated checks verified: `tsc --noEmit`, `eslint`, `vitest` (192 tests), `build:check`.

- [x] 2026-09-09 Rebuilt the owner-only Overview as a responsive CEO dashboard using existing records only: financial KPIs, custom historical comparison, timestamp-based conversion journey, revenue/profit, visitors, submissions, inventory aging, assigned-lead staff performance, follow-up alerts, and data-quality checks. Source attribution and Overview audit activity remain deliberately out of scope.

- [x] 2026-09-08 Implemented Step 1 from plan.md: roles, access boundaries, and staff accounts (branch: `improvement`).
  - `lib/auth/permissions.ts`, `lib/admin/staff-schema.ts`, `0023_staff_roles_permissions.sql`, `require-staff.ts`, `require-admin.ts` (updated), `staff-projections.ts`, `StaffAccounts.tsx`, staff API routes, settings page wiring, route guards on leads/commission/catalog/blocklist. Tests: 30 passing.
  - **Next**: Run `0023_staff_roles_permissions.sql` against a test Supabase instance and verify one full owner → add call centre → disable → re-enable cycle. Then proceed to Step 2 (attribution) or Step 6 (Nodemailer) per client priority.

- [x] 2026-09-07 Fixed Incomplete Forms note/status saving when the existing Supabase project had the activity table but not the migration RPC. The API now has a validated fallback update and activity insert path; apply migration 0021 later to restore the transactional RPC path.
- [x] 2026-09-07 Updated public valuation capture so a valid name plus phone number automatically creates/updates an incomplete-form record after a short typing pause, even without consent, Next, or closing the form.

## In progress

- [x] 2026-09-06 Added a one-time Leads-only demonstration batch: 40 clearly marked
  rows, five per pipeline status, with server-side deletion scoped to the demo
  batch. Apply migration `0020_demo_lead_runs.sql` before using the buttons on
  the deployed app.

- [x] 2026-08-03 Ran migrations 0014, 0015 and 0016 against the live Supabase project and verified the schema and all four functions directly (`KNOWN_ISSUES.md` ISSUE-005).
- [x] 2026-08-03 Set `ADMIN_PREVIEW = false`. The dashboard now reads and writes the real database.

- [ ] Drive one full cycle through the browser on a real (test) lead.
  - Related feature: Inventory, commission, pipeline statuses
  - Acceptance criteria: marking a lead as Deal with a purchase price creates an `inventory` row and the car appears in Inventory; marking it sold writes one `commission_entries` row whose `commission_aed` matches the figure the dialog previewed; `/admin/commission` shows that sale in its month and the quarter total equals the sum of its months.
  - Risks: the SQL is proven, but nothing has exercised the UI → API → SQL path end to end. This is the only untested layer left.
  - Next action: sign in at `/admin/login` and run the cycle.

- [ ] Sanity-check the live Leads screen now that preview mode is off — real leads, real counts, and the two new statuses selectable in Customer Details.

## Deferred (raised, deliberately not built yet)

- [ ] Confirm whether the repo build plan's other M3 items are in scope: `/api/notify` Gmail alerts on a new lead, wiring the Settings page (currently a non-functional mockup — local state only, never calls its own working API), and security headers/CSP (`next.config.mjs` sets only `distDir`). The client's own milestone document does not mention any of them.
- [ ] Decide whether manager accounts should see commission figures at all (RLS currently restricts `commission_entries` and `commission_statements` to `is_admin()`).
- [ ] Statement export (PDF/CSV) for the developer's own invoicing, and VAT/TRN formatting if the developer's side becomes VAT-registered — deliberately out of scope, per the client's choice of a plain commission statement.
- [ ] Allow inventory not sourced from a website lead (auction, walk-in, trade-in) — scoped out by the client; see `DECISIONS.md` ADR-002 for what it would take.

## Previously in progress

- [ ] Run `supabase/migrations/0006_trim_and_option_level.sql` in the Supabase SQL Editor.
  - Related feature: Public valuation form + Admin leads
  - Acceptance criteria: A real form submission (real OTP, real Supabase insert) saves `trim`/`description`/`option_level` and they display correctly on `/admin/leads/[id]`.
  - Risks: None to existing behavior — mock/demo mode keeps working regardless via the graceful-fallback design in `lib/admin/leads-store.tsx` and `use-valuation-form.ts`.
  - Next action: Client/developer runs the migration, then does one real test submission on the live site.

- [ ] Client review of Milestone 1 public landing revisions.
  - Related feature: Public landing page
  - Acceptance criteria: Premium dark glass header, private valuation hero, full-width real-photo sell-side evaluation sections, accepted brand badges, contact-first valuation form, and inspection area field are accepted.
  - Risks: Final logo file, exact Gmail, real financing rules, approved reviews, final make/model dropdown list, and any official brand/logo asset preferences are still needed.
  - Next action: Send/review the live preview and collect exact Gmail, final logo file, final make/model list, and whether financing/reviews should remain preview-only or become later backend scope.

## Next

- [ ] Test admin login live (requires a real Supabase Auth user matching an email in `0002_seed.sql`).
- [ ] Decide on lead data retention/deletion policy (`KNOWN_ISSUES.md` ISSUE-004).
- [ ] Add pagination to `/api/admin/leads` before lead volume grows (`KNOWN_ISSUES.md` ISSUE-003).
- [ ] Collect exact CarVibe Gmail address for notifications/footer.
- [ ] Collect final logo file from the group chat and place it in the project if needed.
- [ ] Confirm whether financing and reviews are approved as real backend-backed scope or should remain UI-only previews.
- [ ] Complete loading, empty, error, and mobile states for the live (non-mock) admin data path.

## Blocked

- [ ] Formal UAE legal/compliance review before production (per `RULES.md` UAE privacy rule) — needs client-arranged legal review, not something to resolve in code.

## Completed

- [x] 2026-08-05 Added the guided WhatsApp OTP production runbook and the standalone `NABIGAY NA NI SIR NYASH ANG WHATSAPP BUSINESS NUMBER` trigger. No Meta number, billing method, production secret, deployment, or real message was changed; the runbook begins when Sir Nyash supplies and authorizes the business number.
- [x] 2026-07-07 Committed and pushed the Milestone 1 landing package to `origin/main` for GitHub/Vercel review.
- [x] 2026-07-07 Prepared Milestone 1 meeting report in Markdown and Word `.docx`, including a non-technical script, live-demo walkthrough, and client question scenarios.
- [x] 2026-07-07 Finalized public landing polish: approved hero kept, hero focus-in animation added, full-page blur replaced with a lighter fade for performance, client `dubaii.jpeg` used in How It Works, How It Works seam blended, and the video band/footer merged into one compact footer.
- [x] 2026-07-05 Tightened "Why Choose Us" sizing (smaller statement/tagline text, compact fixed min-height, tighter spacing) after it was taking up more than a full screen's height, with lint/build verification.
- [x] 2026-07-05 Upgraded "Why Choose Us" to a premium full-bleed photo carousel (real background image, glass arrow controls, slide counter, segmented auto-advance progress bar) and added the missing "How It Works"/"Brands" navbar links, with lint/build verification.
- [x] 2026-07-05 Rebuilt "Why Choose Us" as an auto-advancing 4-slide trust-statement carousel (gold-highlighted phrases, tagline, valuation CTA, arrows/dots), styled after a client reference, with lint/build verification.
- [x] 2026-07-05 Added a scroll-triggered fade/blur reveal animation to the footer's columns and a subtle gold top glow (styled after a client reference, implemented without a new dependency), with lint/build verification.
- [x] 2026-07-05 Removed the "Rent" nav item (Buy-only coming-soon modal now), fixed Hero's leftover "renting" copy, and normalized three sections' drifted background hex colors to the site's actual `bg-bg` token so all sections blend seamlessly, with lint/build verification.
- [x] 2026-07-05 Removed the Financing and fake-Reviews sections (kept the real closing CTA as `FinalCta.tsx`), fixed the navbar "Rent" dangling anchor to open the Coming Soon modal, and refactored the footer (drafted via a 3-agent judge-panel workflow, then independently verified) to drop the redundant background photo/watermark and align cleanly with the new video section, with lint/build verification.
- [x] 2026-07-05 Added a scroll-triggered background-video section before the footer using the client's `footer.mp4` (relocated to `public/videos/`), muted with no controls/loop, only playing while in view, with a blended "CarVibeDubai" wordmark overlay, with lint/build verification.
- [x] 2026-07-05 Simplified Brand Browse (removed the backdrop photo, rewrote copy to "brands we buy - and many more" so unlisted brands don't feel excluded) and added a gold-glow hover-grow animation to each brand logo card, with lint/build verification.
- [x] 2026-07-05 Removed the redundant Vehicle Discovery and Featured Vehicles sections (per client feedback) and added a new Seller Assurance section right after the hero (fair offers, transparency, balanced negotiation, free-valuation CTA), fixing the navbar "Sell" anchor to match, with lint/build verification.
- [x] 2026-07-05 Fixed the hero tagline to a single non-wrapping line, removed the "Introducing/CarVibeDubai" identity block, changed hero/footer copy to UAE-wide (not Dubai-only), replaced "no instant price shown" with "Fair, transparent negotiation", made the navbar "Buy" item open a real Coming Soon modal with a blurred backdrop, removed the Body Type Browse section, and added a new Flexible Inspection section (your location or meet halfway), with lint/build verification.
- [x] 2026-07-05 Added a thin black/gold `UtilityBar` (language label, phone, Facebook/Instagram) above the main navbar, rebuilt the hero with a reference-style "Introducing / CarVibeDubai / Car Buying & Valuation Specialists" identity block plus an outlined CTA, switched the hero image to the client-provided `public/images/hero.jpeg`, and converted the "what we buy" brand-logo grid into an animated infinite marquee, with lint/build verification and privacy/terms pages updated to match.
- [x] 2026-07-05 Hero reverted to the search-bar CTA layout after client feedback (buying-desk two-button version was not preferred), keeping the Dubai Lamborghini image, a larger headline, "we buy your car" lead copy, a hardened mobile-safe CTA, and a clean dev-server restart, with lint/build verification.
- [x] 2026-07-05 Buying-desk hero redesign completed: Dubai Lamborghini hero image, larger headline, "we buy your car" lead copy, gold valuation + WhatsApp CTA pair replacing the search bar, trust row, `Call Now`/`Message Us` navbar actions, and `Coming soon` badge moved to `Buy`, with lint/build verification.
- [x] 2026-07-05 Reference-style hero/header refactor completed with centered pill navigation, `Sell` coming-soon label, Book Now/Login actions, search-bar-style valuation CTA, unchanged valuation form, lint, build, and desktop layout verification.
- [x] 2026-07-05 Real-photo full-width landing redesign completed from selected `public/images/` assets with lint, build, desktop preview, and mobile overflow verification.
- [x] 2026-07-05 Premium public landing UI/UX refactor completed with lighter typography, private valuation hero copy, refined logo/header treatment, asymmetrical vehicle lookbook, reordered homepage flow, concierge contact layout, and lint/build verification.
- [x] 2026-07-05 Public Brand Browse badges updated with lightweight brand-colored SVG treatments.
- [x] 2026-07-03 Editorial-minimal visual redesign of the public landing page completed: flattened canvas background, strict gold usage budget, hairline dividers replacing gold card borders, borderless numbered/divided lists across all sections below the hero, shared Section/SectionHeader components, and dead-code removal. Verified with lint, build, and Playwright visual/interaction checks.
- [x] 2026-07-03 Marketplace-style homepage redesign implemented from the attached UI/UX brief while keeping inventory/financing request-based.
- [x] 2026-07-03 Premium sell-side homepage refinement completed: redundant WhatsApp/search/listing actions removed, generated car imagery added, brand badges upgraded, and floating WhatsApp button removed.
- [x] 2026-07-02 Public header, font, and hero first-view modernization completed.
- [x] 2026-07-02 Public valuation WhatsApp validation bug fixed for common UAE mobile formats.
- [x] 2026-07-02 Milestone 1 public landing revisions implemented from Sir Nyash's form answers.
- [x] 2026-07-02 Proposal-aligned 45-day milestone plan and client message generated from the signed PDF and build plan.
- [x] 2026-06-30 Public landing section redesign implemented for How It Works, Contact, and Footer.
- [x] 2026-06-30 Public landing section redesign verified with lint, production build, desktop anchor behavior, and mobile overflow checks.
- [x] 2026-06-30 How It Works and Contact changed to unique non-photo layouts instead of reusing the hero image.

## Update rule

### Next action — production database verification

- [ ] Apply migrations `0030_manual_leads.sql`, `0031_referral_incentives.sql`,
  and `0032_no_show_status.sql` to the intended Supabase project before
  deploying this workflow.
- [ ] With non-production data, verify employee referral creation with proof,
  sale-triggered frozen incentive, combined staff invoice, and Super Admin
  payment.

### Next action — arrival and inspection report

- [ ] Apply `supabase/migrations/0027_inspection_arrival_reports.sql` to the
  intended Supabase project.
- [ ] In Super Admin → Vehicle Catalog, add the live Specification options.
- [ ] Test one scheduled lead end to end: CSR marks Arrived; assigned Purchaser
  completes every required inspection field and all 24 photos with notes; download the PDF
  and confirm the lead becomes Inspected exactly once.
- [ ] Apply migration `0028_inspection_audit_retention_vin.sql`, set a strong
  production-only `CRON_SECRET`, then verify editable completed reports, VIN
  search, activity history, and one authorized retention-job test.

### Next action — Incomplete-form handoff

- [ ] Apply `supabase/migrations/0026_partial_lead_csr_handoff.sql` to the
  intended Supabase project, then run one controlled CSR-to-Purchaser handoff
  with non-production data.

Every coding session must leave one clear next action.
