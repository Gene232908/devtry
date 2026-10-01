# HANDOFF.md

## Current state

- 2026-10-01 update: five-second incomplete autosave and same-session phone
  correction dedupe are implemented and pushed as `c011d64` to both
  `almostdone` remotes for Valuation and Scrap. Migration
  `0041_partial_lead_capture_sessions.sql` must be applied after `0040` before
  the behavior is relied on in preview. The API safely falls back to the old
  RPC signature during deployment ordering. Local verification passed 269
  tests, TypeScript, ESLint, production build, dependency audit, and an
  in-memory PostgreSQL execution of migration `0041` covering phone correction,
  stale request ordering, existing-phone merge, inquiry-type separation, and
  function permissions.

Migration verification query after applying `0041`:

```sql
select
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'partial_leads' and column_name = 'capture_session_id') as session_column_exists,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'partial_leads' and column_name = 'capture_revision') as revision_column_exists,
  to_regclass('public.partial_leads_capture_session_idx') is not null as session_index_exists,
  count(*) filter (where p.pronargs = 20) = 1 as capture_function_exists,
  bool_or(has_function_privilege('service_role', p.oid, 'EXECUTE')) as service_role_can_run,
  bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_can_run,
  bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) as authenticated_can_run
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'capture_partial_lead';
```

- 2026-10-01 update: the Step 1 abandoned-form race is fixed locally on
  `almostdone` for both Valuation and Scrap. Every exit/consent path reads a
  synchronous latest-values ref, and invalid UAE numbers show format feedback
  on blur. TypeScript, ESLint, 259 tests, and the production build check pass.
  Commit `dd156d0` was pushed to both `almostdone` remotes; the protected
  Vercel preview still needs an authenticated browser check with a valid
  non-production number after deployment completes.

- 2026-10-01 update: incomplete-form retention is implemented on `almostdone`, and migration `0040_partial_lead_retention.sql` was applied to the production Supabase project. Verification found 2 active incomplete forms, 0 archived forms, and 4 preserved converted forms; only `service_role` can execute cleanup. Commit `82f8aa1` was pushed to both GitHub remotes.

- 2026-09-27 update: temporary no-OTP public valuation/Scrap mode is implemented and locally tested, **not deployed**. The code defaults to `PUBLIC_LEAD_VERIFICATION_MODE=unverified`; read `docs/ai/OTP_TEMPORARY_BYPASS/README.md` before any release or later restoration. No migration was needed and no test customer record was inserted. Staging E2E, responsive browser check, and persistent/edge abuse-limit review remain.

- Phase: backend finalization in progress (`FINISH THE PRODUCT` sent 2026-07-17).
- Backend: Supabase is active; the local public valuation/Scrap flow now defaults to direct unverified submission while retaining Meta WhatsApp Cloud API OTP behind an explicit server mode. The older Twilio configuration remains only as legacy reference. The note below about manual migrations is historical and must be rechecked against the current schema.
- Supabase: live project, credentials configured in `.env.local`. Migrations 0001-0005 already applied previously; 0006 (new this session: trim/description/option_level columns, BMW catalog seed) still needs to be run manually in the Supabase SQL Editor.
- Client milestone package: generated under `docs/client/` and aligned with the signed proposal PDF plus `CARVIBE_BUILD_PLAN.md`.
- Milestone 1 public landing page is on `main`, merged from the `milestone-1` branch's UI work, now with the real backend wired underneath (graceful fallback to demo/mock mode when Supabase/Twilio aren't reachable).
- Weekly report: `CALLME`.
- Five-part presentation: `DAY5REPORT`.
- Backend finalization: `FINISH THE PRODUCT` (already sent — see 2026-07-17 in `WORK_LOG.md` for the full breakdown).
- WhatsApp OTP production onboarding: when Sir Nyash has supplied and authorized the real business number, send `NABIGAY NA NI SIR NYASH ANG WHATSAPP BUSINESS NUMBER`. `AGENTS.md` will require the next AI to read `docs/ai/WHATSAPP_OTP_PRODUCTION_SETUP.md` and guide the setup one safe checkpoint at a time.
- WhatsApp OTP emergency stop: `WHATSAPP_OTP_SENDING_ENABLED=false` in the Production environment, followed by a fresh deployment, stops sends before a database write or Meta API call. Restore it to `true` only after investigation and an approved canary.

## Last completed work

**2026-09-15:** Multi-Tab Comprehensive Responsiveness Audit & Multi-Viewport Verification.
- Audited all admin portal tabs (/admin, /admin/inventory, /admin/commission, /admin/incomplete, /admin/blocked, /admin/catalog, /admin/staff, /admin/settings, /admin/leads/[id]) across mobile (390x844), tablet (768x1024), laptop (1366x768), and desktop XL (1920x1080).
- Fixed Commission table action button collision by increasing min table width to 820px, expanding the actions column to 28%, and applying `whitespace-nowrap`.
- Added `sm:flex-wrap` to Inventory filters and `whitespace-nowrap` to Inventory and Blocked numbers tables.
- Added `onNavigate` handler to `Sidebar.tsx` / `AdminShell.tsx` for immediate mobile drawer auto-dismissal.
- Verified zero button overlaps, zero text crowding, and zero broken functions across all 222 Vitest tests, TypeScript, and ESLint.

**2026-09-14:** Vehicle Catalog reliability and pagination fix completed locally. Make, Model, and Trim inserts no longer trigger a full catalog reload; the editor updates the inserted record locally, reports expired sessions explicitly, blocks concurrent duplicate writes, and validates names to 120 characters on client and server. Re-entering an existing value shows a contextual, dismissible toast and an inline hint. The selected make now displays 15 models per themed page. Catalog removal now archives rather than permanently deletes; Undo/Restore and the ten most recent owner actions use new migration `0029_catalog_safety_activity.sql`. A pre-migration deployment retains public catalog reads and normal adds but safely refuses archive actions. Verified with TypeScript, ESLint, 215 Vitest tests, and `npm run build:check`. Production deployment and migration verification remain pending.

**2026-09-09:** Dashboard UI/UX and chart visibility overhaul completed.
- Solved single-color confusion: 8-stage progressive chromatic conversion funnel with stage retention %, operational urgency inventory aging (Emerald, Sky, Amber, Coral Red), and tri-color staff performance.
- Fixed invisible gross profit: Implemented Dual Y-Axis so gross profit (e.g. AED 1,500) has its own vertical scale and stands tall alongside high revenue (AED 20,000) with vibrant Emerald styling and a Gross Margin % badge.
- Fixed single-day ("Today only") views: replaced screen-spanning walls and invisible 1-point area voids with bounded bars (`maxBarSize={48-52}`) and executive single-day comparative cards for revenue and profit.
- Upgraded KPI cards and secondary cards with glowing icon avatars (Coins, TrendingUp, CarFront, WalletCards), accent colors, margin badges, and luxury dark borders.
- Preserved 100% of underlying business logic and database queries. Verified with `tsc --noEmit`, `eslint`, `vitest` (192 passing), and `build:check`.

Earlier in the same day: added a scroll-triggered fade/blur reveal animation to the footer's three columns (staggered timing) and a subtle gold-tinted top glow, based on a client-supplied reference footer component. Implemented with a small local `RevealOnScroll` helper using `IntersectionObserver` + CSS transitions rather than installing the reference's `motion` package, and kept the footer's real content/links (no fake pages) and its seamless blend with the video section above it (skipped the reference's rounded-card border look, which would have reintroduced a seam).

Earlier in the same day: removed the "Rent" navbar item (no live section existed for it); "Buy" alone now opens the "Coming Soon" modal, reverted to Buy-only copy. Fixed `Hero.tsx`'s subcopy, which still mentioned renting. Audited every section's background color after the client asked whether some sections were "really just plain" and asked for smoother blending between sections - found `Hero.tsx`, `BrandBrowse.tsx`, and `WhyChooseUs.tsx` used ad-hoc hex shades slightly different from the site's actual `bg-bg` canvas token; normalized all three so every section transition uses the exact same color. The sections without photography (Seller Assurance, Flexible Inspection, Brand Browse, Footer) are an intentional editorial rhythm, not a missing-content bug - flagged to the client as a possible separate follow-up if they'd prefer photography there instead.

Earlier in the same day: removed the Financing preview section and the placeholder-reviews block (both flagged by the client), keeping the real closing CTA as a standalone `FinalCta.tsx`. Fixed the navbar's "Rent" item, which pointed at the now-deleted `#financing` anchor - it now opens the same "Coming Soon" modal as "Buy". Refactored the footer to remove its own background photo/giant watermark (both redundant with the new video section above it) and rebuilt it as a clean 12-column grid with contact facts (including a new Hours row) and icon-based social links; this design came from a 3-draft-plus-judge workflow, independently re-verified (lint, build, config field checks) before shipping.

Earlier in the same day: added a new background-video section right before the footer on the homepage, using the client's `footer.mp4` (relocated from `components/ui/` to `public/videos/`, since only `public/` is servable by Next.js). The video is muted with no controls (no play button/progress bar visible), does not loop, and only plays while the section is scrolled into view (pausing when scrolled away), via `IntersectionObserver`. A large "CarVibeDubai" wordmark sits centered over it using a blend-mode treatment so it visually integrates with the footage rather than looking like a flat label on top.

Earlier in the same day: simplified the Brand Browse section: removed the left backdrop photo/text column, and changed the copy to "Here are the brands we buy - and many more." with a short reassurance that unlisted brands are still welcome (so the ten shown logos don't read as an exclusive list). Each brand logo card in the marquee now grows on hover (`scale-[1.15]` with a soft gold glow), referencing a supplied Dribbble automotive landing page design.

Earlier in the same day: removed the Vehicle Discovery ("What CarVibeDubai Evaluates") and Featured Vehicles ("Vehicle Profiles") sections after the client flagged them as unnecessary/redundant, deleting their unused config exports and icon imports. Added a new `SellerAssurance` section right after the hero: "Why Sell To CarVibeDubai" with three short assurance points (fair market-based offers, transparency, balanced mutual-agreement negotiation) and a "Get Your Free Valuation" CTA. Fixed the navbar's "Sell" link, which pointed at the now-removed `#vehicle-discovery` anchor, to point at the new section instead, and removed the "Buy" nav item's unused dead `href`.

Earlier in the same day: fixed the hero tagline "Fast, Fair & Hassle-Free." to always render on one line (its own smaller `whitespace-nowrap` size), removed the "Introducing / CarVibeDubai / Car Buying & Valuation Specialists" identity block per client feedback, changed the headline and footer tagline from Dubai-only to UAE-wide coverage, and replaced the assurance line's "no instant price shown" with "Fair, transparent negotiation". The navbar's "Buy" item (desktop and mobile) now opens a real "Coming Soon" modal with a blurred backdrop and a "Get Free Valuation Instead" shortcut, instead of silently anchor-scrolling. The client was asked which homepage section was no longer needed and chose Body Type Browse; that section, its `bodyTypes` config, and unused icon imports were removed, and a new `FlexibleInspection` section was added in its place explaining that CarVibeDubai can inspect the car at the seller's location or meet halfway.

Earlier in the same day: added a persistent thin `UtilityBar` (black/gold hairline strip with a static "English" label, `tel:` phone link, and Facebook/Instagram icons) fixed above the main `Navbar`, which now sits at `top-8` instead of `top-0`. Rebuilt the hero with a reference-style identity block ("Introducing" eyebrow + large `CarVibeDubai` wordmark + "Car Buying & Valuation Specialists" subtitle) above the existing, unchanged headline/paragraph copy; replaced the search-bar CTA with an outlined uppercase-tracked button (still opens the valuation modal); and switched the hero background to the client-provided `public/images/hero.jpeg`. Converted the "what we buy" accepted-brands logo grid (`BrandBrowse.tsx`) into a seamless infinite-scrolling animated marquee. `app/privacy/page.tsx` and `app/terms/page.tsx` were updated to render the same `UtilityBar` and had their top padding increased to clear the taller fixed header. The valuation form/modal remains unchanged. This remains UI-only; no backend, database, storage, or new personal-data handling was added.

## Current task

Review the pushed Milestone 1 public landing package, live site, and meeting pack with the client.

## Important decisions

- Normal source files should remain below 500 lines.
- Data access should use repositories or services.
- Mobile, security, and performance are required.
- Supabase finalization begins only after approval.

## Known blockers

- Client approval of the finalized milestone schedule.
- Final access/details for domain, Supabase, Twilio, Gmail, Vercel, and Meta Pixel if used.
- Exact CarVibe Gmail address.
- Final logo file from the group chat.
- Final make/model dropdown list and future editable dropdown rules.
- Approval and real data/rules for financing estimates and customer reviews.
- Official brand/logo asset preferences if Sir Nyash wants exact brand files instead of the current badge-style marks.
- Final dashboard users, CRM pipeline wording, and remaining business contact details.

## 2026-09-13 handoff — adjustment branch

The active local branch is `adjustment`. The new Arrival / Specification /
Purchaser inspection workflow is source-complete and verified locally, but it
requires `supabase/migrations/0027_inspection_arrival_reports.sql` before use
against Supabase. Apply it once through the approved SQL process, add live
Specification entries in Super Admin → Vehicle Catalog, then use non-production
data for one complete CSR-arrival → Purchaser-report → PDF test. No deployment
or remote database write was performed in this change.

## Exact next action

Apply `supabase/migrations/0030_manual_leads.sql` to the intended Supabase
project, then create one non-production manual lead from each role. Confirm a
Call Centre creator receives their own lead, other roles route it to the Call
Centre queue, the source is visible, and a repeated phone is flagged. Referral
incentives are enabled by applying `0031_referral_incentives.sql` immediately
after `0030_manual_leads.sql`. No additional Vercel environment variable is
required.

After both migrations, use non-production data to verify: create a manual
employee-referred lead with a proof file, buy its vehicle, mark the inventory
car Sold, confirm the frozen amount appears in that employee's Commission
screen and invoice, then use the Super Admin payment action once.

Apply `supabase/migrations/0032_no_show_status.sql` after the inspection
migrations before using the No Show status in production.

Apply `supabase/migrations/0026_partial_lead_csr_handoff.sql` in the intended
Supabase SQL Editor, then use a safe test record: capture an incomplete form,
confirm it appears only for its assigned CSR, complete its details, select
**Inspection Scheduled**, and confirm it becomes one Lead with an assigned
Purchaser. Do not deploy or push this task until the user explicitly asks.

## 2026-09-13 handoff - inspection audit and retention

The active branch remains `adjustment`. Source now includes the green Purchaser
Start inspection handoff, editable completed reports for Purchaser/Super Admin,
per-card and per-photo audit events, mandatory notes for all 24 required photos
(including front and rear bumpers), VIN inventory lookup, and the protected
60-day post-sale photo cleanup. PDF output is eight pages, branded, low-ink,
and preserves image aspect ratios.

Before live testing, apply migrations `0027_inspection_arrival_reports.sql` and
`0028_inspection_audit_retention_vin.sql` in order and configure `CRON_SECRET`
in the target Vercel environment. Then run one non-production end-to-end test:
Call Centre schedules and marks arrival, Purchaser starts/saves/completes/edits
the inspection, Super Admin views/edits history, PDF downloads, Inventory finds
the VIN, and the retention endpoint is invoked with its protected credential.
No remote migration, deployment, or production data mutation was performed.
