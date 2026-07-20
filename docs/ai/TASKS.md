# TASKS.md

## Current objective

Run the one remaining manual database migration for the just-restored Supabase backend, then verify a real end-to-end valuation submission.

## In progress

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

Every coding session must leave one clear next action.
