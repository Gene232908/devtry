# HANDOFF.md

## Current state

- Phase: backend finalization in progress (`FINISH THE PRODUCT` sent 2026-07-17).
- Backend: Supabase with Meta WhatsApp Cloud API OTP is the active valuation-form path; the older Twilio configuration remains only as legacy reference. One manual step open — see below.
- Supabase: live project, credentials configured in `.env.local`. Migrations 0001-0005 already applied previously; 0006 (new this session: trim/description/option_level columns, BMW catalog seed) still needs to be run manually in the Supabase SQL Editor.
- Client milestone package: generated under `docs/client/` and aligned with the signed proposal PDF plus `CARVIBE_BUILD_PLAN.md`.
- Milestone 1 public landing page is on `main`, merged from the `milestone-1` branch's UI work, now with the real backend wired underneath (graceful fallback to demo/mock mode when Supabase/Twilio aren't reachable).
- Weekly report: `CALLME`.
- Five-part presentation: `DAY5REPORT`.
- Backend finalization: `FINISH THE PRODUCT` (already sent — see 2026-07-17 in `WORK_LOG.md` for the full breakdown).
- WhatsApp OTP production onboarding: when Sir Nyash has supplied and authorized the real business number, send `NABIGAY NA NI SIR NYASH ANG WHATSAPP BUSINESS NUMBER`. `AGENTS.md` will require the next AI to read `docs/ai/WHATSAPP_OTP_PRODUCTION_SETUP.md` and guide the setup one safe checkpoint at a time.
- WhatsApp OTP emergency stop: `WHATSAPP_OTP_SENDING_ENABLED=false` in the Production environment, followed by a fresh deployment, stops sends before a database write or Meta API call. Restore it to `true` only after investigation and an approved canary.

## Last completed work

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

## Exact next action

Apply `supabase/migrations/0026_partial_lead_csr_handoff.sql` in the intended
Supabase SQL Editor, then use a safe test record: capture an incomplete form,
confirm it appears only for its assigned CSR, complete its details, select
**Inspection Scheduled**, and confirm it becomes one Lead with an assigned
Purchaser. Do not deploy or push this task until the user explicitly asks.
