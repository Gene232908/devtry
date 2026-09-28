# RESPONSIVE_PERFORMANCE.md

Read this for UI, dashboard, form, table, navigation, image, or data-heavy tasks.

## Mobile-first widths

Check approximately:

- 320px
- 375px
- 430px
- 768px
- 1024px
- 1280px
- 1440px+

## Responsive rules

- Start with one-column mobile layouts.
- Add columns only when readable.

## 2026-09-15 Multi-Tab Responsive Hardening & Action Button Alignment

- **Modal Portal Teleportation & Pinned Layout**: All modal dialogs (`Dialog.tsx`) use `createPortal(..., document.body)` so they escape parent CSS `backdrop-filter` or containing blocks. Overlays use `overflow-y-auto` with `my-auto` self-centering to prevent flexbox negative margin top clipping. Multi-input modal forms (`ManualLeadDialog.tsx`) use a pinned header (`shrink-0`), scrollable body (`flex-1 overflow-y-auto`), and pinned footer (`shrink-0`) bounded by `max-h-[calc(100vh-2rem)]`, ensuring the title and action buttons are always on-screen and never overlap or clip at the top.
- **Multi-Tab Responsive Table Hardening**: Enforces generous minimum widths on administrative data tables containing multi-button actions (e.g. Commission table set to `min-w-[820px]` with 28% action column width; Blocked numbers limits table set to `min-w-[760px]`). Action buttons and numeric/date figures are strictly wrapped with `whitespace-nowrap` to eliminate button collision and multi-line wrapping.
- **Adaptive Filter Containers**: Uses `sm:flex-wrap` and flexible containers across filter toolbars (such as in Inventory) so multi-select dropdowns and search bars wrap neatly without spilling out or crowding on 768px–1366px screens.
- **Mobile Navigation Drawer Auto-Dismiss**: The mobile sidebar drawer accepts `onNavigate` and triggers on every link tap, ensuring immediate drawer closure without requiring manual backdrop dismissal.

## 2026-09-15 Logo Emblem Mode, Zero Horizontal Scroll & Streamlined Entity Views

- **Logo Emblem Mode for Topbar (`Logo.tsx`)**: In the admin topbar (`size="sm"`), the `"CARVIBEDUBAI"` wordmark text is hidden on mobile, tablet, and laptop screens (`isSmall ? "hidden 2xl:flex" : "flex"`). Only the circular gold emblem is displayed, freeing ~130px of horizontal space. This prevents the right-aligned user profile avatar menu and "+ Lead" CTA from being pushed off-screen or clipped on narrow viewports (e.g. 440px iPhone 16 Pro Max, 390px, 768px).
- **Zero Horizontal Page Scrolling Enforcement (`AdminShell.tsx` & `OverviewDateFilter.tsx`)**: Root admin shell and `<main>` containers enforce `overflow-x-hidden max-w-full`. The Executive Dashboard Date Filter Card uses `flex-col sm:flex-row sm:items-center` so that date triggers, backlog reset button, and status badges stack neatly without blowing out screen bounds (`scrollWidth <= innerWidth`).
- **Streamlined Entity View Ruling (<1024px / `<lg`)**:
  - **Leads Directory & Recent Leads**: On mobile and medium screens (`block lg:hidden`), displays a streamlined client card list prioritizing the **Client Name** as the bold primary element, with car & date subtitle, status pill, and direct tap target to `/admin/leads/[id]`. Wide 9-column tables are reserved for large desktop viewports (`hidden lg:block`).
  - **Inventory Directory (`MobileInventoryList.tsx`)**: On mobile and medium screens (`block lg:hidden`), replaces the 11-column 980px table with a streamlined car-first list prioritizing the **Car Details** (Year, Make, Model, Trim, VIN) with purchase price, status pill, "Mark sold" trigger, and direct link to lead details. Desktop retains the full 11-column financial/commission table (`hidden lg:block`).
  - **Rule 1 File-Size Maintenance**: Extracted `InventoryTable.tsx` and `MobileInventoryList.tsx` from `inventory-client.tsx`, keeping `inventory-client.tsx` at 468 lines (strictly under the 500-line limit).

## 2026-09-15 Leads Directory Responsive Pattern & Topbar CTA

- **Mobile Viewport (<768px / md:hidden)**: Instead of rendering heavy 9-column horizontal tables on small screens, switch to a streamlined `MobileLeadsList`. Displays the **Client Name** as the primary high-contrast element with avatar initial, vehicle subtitle, date, status pill, arrival indicator, and touch chevron. Eliminates forced horizontal scrolling on phones while providing immediate 44px+ tap navigation to `/admin/leads/[id]`.
- **Laptop & Desktop Viewports (>=768px / hidden md:block)**: Renders the complete 9-column table. Enforces `whitespace-nowrap`, `tabular-nums`, and balanced minimum column widths (`min-w-[105px]` - `min-w-[180px]`) so cells like mileage (`20,000 km`) and submission dates (`14 Sept 2026`) never wrap awkwardly to two lines.
- **2-Tier Responsive Table Toolbar**: Splits the toolbar into Tier 1 (Search input with clear icon + lead counter badge + refresh button + export dropdown) and Tier 2 (Multi-select dropdown filters + clear filters button). Removes "+ Add Lead" from the table header to avoid horizontal crowding on 1024px–1440px laptops (e.g. 1366x768).
- **Persistent Glowing Topbar CTA**: Moves "+ Add Lead" to the Topbar next to the user profile menu for Super Admin and Call Centre roles. Uses an illuminated amber-gold gradient with glowing shadow and high contrast icon (`<UserPlus>`) so staff can trigger manual intake globally from anywhere without hunting for the table toolbar button.
- **Isolated Logo Mark**: Uses an isolated transparent gold emblem (`logo-mark.png`) inside the circular header badge rather than scaling the full circular logo image. Ensures crisp 1:1 centering without microscopic duplicate text ("CarVibeDubai") or clipping artifacts.

## 2026-09-12 Admin document scrolling

- The admin shell uses the browser document as its one vertical scroll owner.
  Do not put routine admin pages inside a fixed-height `overflow-y-auto` main
  region: it creates competing browser and dashboard scrollbars. The top bar
  remains sticky, while dashboard cards, tables, and their deliberate mobile
  horizontal-overflow strategies remain unchanged.

## 2026-09-11 Executive Dashboard Rendering & Navigation Performance

- **Eliminate GPU Backdrop-Blur Shaders on Bento Cards**: Never place `backdrop-blur-md` or `backdrop-blur-sm` on dozens of repeating dashboard cards or chart shells. Overlapping CSS backdrop filters force continuous GPU framebuffer readbacks and Gaussian blur shader passes on every scroll frame and mouse move, collapsing frame rates on High-DPI screens and Windows laptops. Use solid dark surfaces (`bg-[#141417] border-white/10`) instead.
- **1-Frame Deferred Chart Mounting**: Do not mount complex SVG chart trees synchronously with the page shell. Render the headers, filters, KPI cards, and operational panels immediately (<10ms), and defer Recharts mounting by 1 animation frame (`requestAnimationFrame`). Reserve exact container dimensions with lightweight placeholders to ensure Cumulative Layout Shift (CLS) is 0 while keeping the main JavaScript thread completely free for instant sidebar clicks.
- **Debounce ResizeObservers on Recharts**: Add `debounce={50}` and `minWidth={0}` to all `<ResponsiveContainer>` instances to prevent synchronous layout reflow loops when containers measure parent DOM dimensions.
- **Avoid Aggressive Prefetch on All Nav Links**: Do not force `prefetch={true}` across all sidebar links simultaneously in dev or production. Use standard viewport prefetching to avoid concurrent route compilation spikes.

- Bento grids collapse from four KPI cards to one column. Wide staff details
  remain in a scrollable table instead of shrinking financial values below a
  readable size.
- Single-day ("Today") chart rendering: Recharts AreaChart and LineChart without
  connecting data points render invisible voids or isolated dots. Handled by
  dedicated single-day executive comparison cards for financial metrics and
  bounded column BarCharts (`maxBarSize={48-52}`) for web traffic and submissions,
  preventing horizontal bar expansion across the viewport.
- Financial charts utilize Dual Y-Axis (Revenue Left, Gross Profit Right) so that
  narrow profit margins (e.g. 5-10%) remain visibly prominent and readable.
- Initial data is server-rendered; date changes call one owner-only aggregation
  endpoint. Existing Recharts visuals remain client-rendered for correct
  container measurement.
- Each aggregation query is capped at 5,000 existing rows. Database-side
  summaries may be needed when records approach that limit.
- Prevent page-level horizontal scrolling.
- Use responsive padding, gaps, and max-width containers.
- Use fluid font sizes or `clamp()` where useful.
- Keep important touch targets around 44×44 CSS pixels.
- Make forms stack logically on mobile.
- Give tables a safe mobile strategy.
- Make dialogs fit and scroll inside the viewport.
- Do not rely on hover-only behavior.

## 2026-09-10 Commission category filter

- The Super Admin Commission category control uses real checkbox inputs inside labels, with 40px option rows and a 44px trigger. It closes on outside click or Escape and keeps the wide commission table scrollable on small screens rather than compressing financial figures.
- Selecting categories changes only the existing client-side presentation; it adds no database request. Refresh uses the same authorized staff and developer endpoints that existed before.

## 2026-09-10 Executive action panels

- Needs Attention remains the cross-business urgent-action list. The neighboring Lead Pipeline card uses five compact, clickable current-stage rows rather than repeating those alert counts.
- Pipeline stage links pass validated `status`, `from`, and `to` query values to the existing Leads Directory, visibly retain the matching checkbox filter, and apply the same UAE date range as the Dashboard number. No extra overview request or new database query is introduced by a click.

## Performance rules

- Prefer Server Components for non-interactive content.
- Keep Client Components small.
- Avoid request waterfalls and duplicate requests.
- Paginate growing lists.
- Avoid `select *` when all fields are not needed.
- Prevent N+1 queries.
- Optimize vehicle images and thumbnails.
- Avoid heavy dependencies for simple behavior.
- Avoid loading all records at once.
- Know which "checks" are secretly network calls. `supabase.auth.getUser()` is
  not a local read — it calls Supabase's auth server every time. In middleware
  that lands on every page AND every API request. Prefer `getClaims()`, which
  verifies the JWT locally (this project uses ES256 keys). See ADR-003.
- Never run a query in middleware whose result only a redirect can use, on a
  path that cannot redirect. API routes cannot redirect.
- Count round trips per user action, not per function. A client component that
  fetches after hydration turns one navigation into two serial trips through
  middleware. Server-render the initial data instead where the page allows it.
- Give every route group a `loading.tsx`. Without one the browser sits on the
  previous page for the whole navigation, which reads as frozen rather than
  busy, and Next has no static shell to prefetch for dynamic routes.

## Design system changelog

- 2026-07-05 "Why Choose Us" sizing tightened: the client reported the section didn't fit the screen, especially the font and text positioning. The root cause: `py-section` (a fluid token, up to 128px per side, meant for the generous rhythm BETWEEN page sections) was reused as the carousel's own vertical padding, combined with a 270-320px reserved content-height buffer and `text-fluid-4`/`text-fluid-5` statement text (max ~76px) - together pushing total section height past 700px. Fixed by giving the `<section>` an explicit `min-h-[540px] lg:min-h-[580px]` with `flex items-center` (so the now-shorter content is vertically balanced within a fixed, predictable height instead of padding alone determining height), dropping padding to `py-14 sm:py-16`, the statement text to `text-fluid-2 sm:text-fluid-3`, the reserved content-height buffer to `190px`/`170px`, the tagline to `text-fluid-1`, the CTA button to the default (medium, not "lg") size, and the arrow buttons from `h-12 w-12`/`h-5 w-5` icons to `h-10 w-10`/`h-4 w-4`. Internal gaps (`mt-10`, `mt-14`) were tightened to `mt-7`, `mt-9`. This is a general lesson for future full-bleed carousel/hero-style sections in this codebase: `py-section` is for the space BETWEEN sections, not a section's own internal padding when that section needs a controlled, compact height - use an explicit `min-h` + `flex items-center` instead. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart confirmed the new `min-h-[540px]` class and the section's content render in the response body.

- 2026-07-05 "Why Choose Us" upgraded to a premium full-bleed photo carousel; navbar section links completed: the client found the previous flat-`bg-bg` carousel too plain and asked for a genuinely premium, modern look. `WhyChooseUs.tsx` switched from using the shared `Section` component to a bespoke `<section>` (matching `Hero.tsx`'s pattern) so it could carry a full-bleed background photo (`landingImages.trust`, re-added pointing at `carvibe-real-range-rover.jpeg`) under the same two-layer gradient technique already used in `Hero.tsx` (left-to-right darkening + top-to-bottom vignette). Since bypassing `Section` also meant losing its automatic `scroll-mt-28 sm:scroll-mt-32`, that was added back manually - otherwise the fixed utility-bar+navbar stack would cover the top of the section when the "About Us" nav link jumps to `#why-us`. Added: a small "01 / 04" slide-position counter next to the eyebrow; glass-style circular arrow buttons (`border-white/15 bg-white/5 backdrop-blur-md`, matching the utility/nav pill glass treatment used elsewhere); and a segmented auto-advance progress bar - 4 thin `bg-white/15` tracks, each containing a `bg-gold` fill that is `w-full` (already played), `w-0` (upcoming), or animates via a new `animate-progress-fill` class (currently playing). The `progress-fill` keyframe/animation was added to `tailwind.config.ts` with its duration hardcoded to `7000ms` to match the component's `AUTO_ADVANCE_MS` constant (documented with an inline comment reminding both must be kept in sync manually, since Tailwind config values can't reference JS constants at build time). Giving the active bar's inner `<span>` a `key={`${i}-${index}`}` forces it to remount (and therefore restart its CSS animation from 0%) every time the active slide changes, including when the carousel wraps back to a previously-seen slide.
  Separately, the client asked for the navbar to include the page's "necessary sections" - auditing `app/(public)/page.tsx` against `Navbar.tsx`'s `NAV_ITEMS` found `SellExperience` (`#sell-your-car`) and `BrandBrowse` (`#brands`) were real, fully-built sections with no nav entry pointing to them at all (only reachable by scrolling). Added "How It Works" and "Brands" to `NAV_ITEMS`. No new npm dependencies were added for either change. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart confirmed via the response body that both new nav labels render and the Range Rover background image is referenced in the Why Choose Us markup (the progress-bar animation and slide-in transition are CSS/JS-driven and need a manual browser check).

- 2026-07-05 "Why Choose Us" rebuilt as a trust-statement carousel from a client reference: the client shared a 21st.dev "about section" component (big bold multi-color-highlighted statement, secondary tagline, CTA button, prev/next arrows, implied auto-slide) and asked for `WhyChooseUs.tsx` to be rebuilt in that style with black background and copy specifically aimed at building trust/assurance/engagement for car sellers. The previous image+stats+trust-points layout was fully replaced with a 4-slide client-side carousel (`useState` for the active index, `setInterval` in a `useEffect` keyed on `[index]` for auto-advance every 7s - the effect dependency means any manual navigation clears and restarts the timer instead of fighting it). Highlighted key phrases use a single `text-gold` treatment (not the reference's blue/orange/green mix) to stay within the site's documented gold-usage-budget convention. A new `slide-in` keyframe (opacity 0→1, translateX 28px→0, 550ms ease-out) was added to `tailwind.config.ts` and is triggered by remounting the slide content via `key={index}` - the existing global `prefers-reduced-motion` rule in `globals.css` already zeroes transition/animation durations sitewide, so no extra accessibility handling was needed. The slide content area has an explicit `min-h` (`280px`/`320px`/`300px` at sm/lg) so the section doesn't change height and shove the sections below it as slide text length varies. The section kept `bg-bg` (from the prior section-blending normalization) and its `id="why-us"` anchor target. Removed the now-unused `trustPoints`/`businessStats`/`TrustPoint` config, the orphaned `ShieldCheck` icon import, and `landingImages.trust` from `config/homepage.ts`. No new npm dependencies were added. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart confirmed the new eyebrow and first slide's copy render in the response body (the auto-advance/arrow/dot interactions and slide-in transition are JS/CSS-driven and need a manual browser check).

- 2026-07-05 footer scroll-reveal animation from a client reference, no new dependency: the client shared a generic shadcn footer component that used the `motion` npm package for per-column scroll-triggered fade-in-blur reveals, plus a rounded-top bordered "floating card" treatment and placeholder link categories (Product/Company/Resources/Social Links, several pointing at routes like `/blog`/`/changelog`/`/faqs` that don't exist in this app). The ask was to match the *feel* (animated, modern) with real CarVibeDubai content, not the literal demo. `Footer.tsx` became `"use client"` and gained a small local `RevealOnScroll` component: an `IntersectionObserver` (`threshold: 0.2`, disconnects after first trigger - no repeated animation on re-scroll) toggles a `visible` boolean that switches Tailwind classes (`blur-sm`/`translate-y-2`/`opacity-0` → `blur-none`/`translate-y-0`/`opacity-100`) over a `transition-all duration-700 ease-out`, with each of the 3 columns staggered via an inline `transitionDelay` (0ms/120ms/240ms) - the same architectural pattern already used by `FooterVideoBand.tsx`'s play/pause trigger, so no new animation library was installed. The existing global `@media (prefers-reduced-motion: reduce)` rule in `globals.css` (which already zeroes `transition-duration` sitewide) covers this automatically. A subtle gold-tinted radial glow (`radial-gradient(45%_100%_at_50%_0%,rgba(212,175,55,.07),transparent)`) was added at the top of the footer for polish. The reference's rounded-top/bordered card treatment was deliberately NOT adopted, since it would reintroduce a visible seam at the exact boundary the footer was just normalized (previous entry) to blend seamlessly into - this was a judgment call to prioritize the more recent, explicit "sections must blend" requirement over literally copying every visual detail of the new reference. All real footer content (logo, tagline, valuation CTA, contact facts, Privacy/Terms/Admin links, social icons, copyright) was preserved unchanged; only the fake placeholder link categories from the reference were excluded. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart confirmed the footer content and the new radial-glow gradient are present in the response body (the reveal animation itself is JS/CSS-transition-driven and isn't visible in raw HTML, so it needs a manual browser check).

- 2026-07-05 Rent nav item removed, section background colors normalized: the client asked whether some sections were "really just plain" with no background and asked for smoother blending between sections. Auditing every section's className found `Hero.tsx` (`bg-[#070808]`), `BrandBrowse.tsx`, and `WhyChooseUs.tsx` (both `bg-[#080807]`) used ad-hoc hex shades that drift slightly from the site's documented two-tone canvas system (the 2026-07-03 editorial-minimal entry above: "one canvas (`--bg`) plus a single elevated panel tone (`--bg-panel`)"), while `SellExperience.tsx` and `Contact.tsx` already correctly used `bg-bg`, and the `Section`-default components (`SellerAssurance`, `FlexibleInspection`) are transparent and inherit the body's `bg-bg` anyway. All three drifted sections were changed to `bg-bg` so every section-to-section seam now shares the exact same canvas color instead of three near-identical-but-not-equal near-blacks - this was the root cause of the "not blending" perception, not a missing-background problem. The sections without photography (Seller Assurance, Flexible Inspection, Brand Browse, Footer) remain intentionally plain as editorial breathing room between the photo/video-rich sections (Hero, Sell Experience, Why Choose Us, Final CTA, Contact, Footer Video Band) - this rhythm was flagged to the client as a design choice they can ask to change if they'd prefer photography in those sections instead.
  Separately, the "Rent" navbar item was removed (it had no corresponding section and, since the last change, shared the "Coming Soon" modal with "Buy"); the modal reverted to Buy-only copy and `Hero.tsx`'s subcopy dropped its "renting" mention so nothing on the page still implies a renting feature exists without any corresponding UI. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart confirmed via the response body that "Rent" and the old renting copy are gone and none of the three ad-hoc hex background classes remain.

- 2026-07-05 Financing/Reviews removed, Final CTA extracted, footer redesigned via judge-panel workflow: `FinancingSection.tsx` and `ReviewsAndFinalCta.tsx` were deleted (client-flagged as unnecessary/placeholder - the reviews block was explicitly labeled "Verified format pending real reviews" in its own copy); the real closing CTA was preserved as standalone `FinalCta.tsx` so the site keeps its one genuine bottom-of-page conversion moment. Orphaned `financingHighlights`/`customerReviews`/`landingImages.financing`/`landingImages.reviews` were removed from `config/homepage.ts`. The navbar's "Rent" item lost its only anchor target (`#financing`) in the process; rather than leave a dead link, both "Buy" and "Rent" now share the same `COMING_SOON_LABELS` check and open one generalized "Buy & Rent... Coming Soon" modal - both are genuinely unbuilt marketplace features, so this is more honest than a scroll-to-nowhere link.
  The footer redesign used a 3-draft-plus-judge Workflow run (documented here since it's a reusable pattern for future "make X modern/professional" design asks): three agents independently proposed minimal/editorial, structured/grid, and bold-typographic directions, each instructed to read the actual current codebase first (Footer.tsx, FooterVideoBand.tsx, globals.css's gold-budget comment, tailwind.config.ts, brand.ts, copy.ts, UtilityBar.tsx) rather than invent tokens. A fourth judge agent re-read the same files plus Contact.tsx/Section.tsx/FinalCta.tsx to independently verify each draft's claims - it caught that the "minimal" draft's divider-gold-fade placement, despite a plausible rationale, didn't match the one real precedent in the codebase (`Section.tsx`'s `divider="gold"` renders it full-bleed/absolute/top-of-section, as used by `FinalCta.tsx`), while the "structured" draft matched it exactly and also mirrored `Contact.tsx`'s existing `dl`-of-facts-with-gold-icons pattern more faithfully. The judge synthesized a final version primarily from the structured draft. Before shipping, I (not the workflow) independently re-verified: read the actual file the workflow claimed to leave on disk (it had in fact been overwritten with a stray draft mid-run by one of the agents, not the judge's final version - caught by diffing against the returned JSON before trusting it), confirmed `brand.hours` exists, then wrote the judge's returned code myself and ran `npm run lint` + `npm run build` fresh. The final footer: no background image, no giant watermark (both removed - they duplicated `FooterVideoBand`'s own visual moment directly above), a single top `divider-gold-fade` continuing that section's gradient hand-off, a 12-column grid (5/4/3 split) with semantic `dl`/`dt`/`dd` contact facts (Showroom Area, Direct Line as a `tel:` link, and a new Hours row from `brand.hours`), and bordered circular Facebook/Instagram icon buttons reusing the exact inline SVGs from `UtilityBar.tsx` (not `lucide-react`, which doesn't export brand icons). Remains a plain Server Component - no `"use client"`, no hooks. All `lg:`-gated grid/border rules collapse to a single stacked column below `lg:`, so 320-1440px+ all render without horizontal overflow. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart served 200 with the new footer content confirmed present and the old watermark confirmed absent in the response body.

- 2026-07-05 scroll-triggered footer video band: the client's `footer.mp4` was supplied under `components/ui/`, which Next.js does not serve statically (only `public/` is exposed) - it was moved to `public/videos/footer.mp4`. The new `components/public/FooterVideoBand.tsx` renders a `<video muted playsInline preload="metadata">` with no `controls` and no `loop` attribute, so no play button/progress bar ever shows and it stops on its last frame instead of repeating. Playback is driven entirely by an `IntersectionObserver` (`threshold: 0.35`) that calls `.play()`/`.pause()` as the section enters/exits the viewport - there is no `autoPlay` attribute, so the video never starts on initial page load regardless of scroll position. `preload="metadata"` avoids fetching the full ~1.6 MB file until playback is actually triggered, keeping it out of the initial page-weight budget. The section is rendered as the last item in `app/(public)/page.tsx` (homepage only, not `/privacy` or `/terms`, which also render `Footer` but aren't marketing pages) so it sits immediately before the layout's `<Footer />`. The `{brand.name}` wordmark overlay uses Tailwind's `mix-blend-overlay` utility over a `from-black/55 via-black/50 to-bg` gradient, both for legibility insurance and to transition smoothly into the footer's `bg-bg` color at the seam. No new dependencies were added. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart confirmed both the homepage HTML references the video and that `http://localhost:3000/videos/footer.mp4` itself returns HTTP 200 (the file is genuinely servable, not just linked).

- 2026-07-05 Brand Browse simplified + hover-grow animation: removed the left `.68fr` backdrop-image column from `BrandBrowse.tsx` (and the now-orphaned `landingImages.brandBackdrop` key), collapsing the `[.68fr_1.32fr]` grid to a single full-width marquee wrapper. Each logo `<article>` gained `relative`, `hover:z-10`, `hover:scale-[1.15]`, and a soft gold `box-shadow` on hover, referencing a supplied Dribbble automotive landing page where the hovered brand logo grows larger than its neighbors. The marquee wrapper's `py-10` became `py-12` so the 15%-larger card has headroom against the wrapper's `overflow-hidden`/edge `mask-image` without being clipped top/bottom. The existing `hover:[animation-play-state:paused]` on the scrolling row already pauses the marquee while a card is hovered, so the grow effect isn't fighting the scroll animation. No new dependencies. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart served 200 with the new copy present and the old backdrop text gone (the hover-scale itself is CSS-only and wasn't machine-verifiable from the response body).

- 2026-07-05 Vehicle Discovery/Featured Vehicles removed, Seller Assurance added: the client identified `VehicleDiscovery.tsx` ("What CarVibeDubai Evaluates") as unnecessary and `FeaturedVehicles.tsx` ("Vehicle Profiles") as redundant with it - both were deleted along with `evaluationProfiles`/`featuredVehicles` config and the `Truck`/`Crown`/`Gauge`/`Car` icon imports that became orphaned in `config/homepage.ts` once both consumers were gone. The new `SellerAssurance.tsx` reuses the same `Section`/`SectionHeader` and hairline-grid-of-cards pattern as `FlexibleInspection.tsx`/`BrandBrowse.tsx` (`grid gap-px` cards on `bg-bg/95`) for visual consistency, and is `"use client"` (matching `ReviewsAndFinalCta.tsx`'s convention) since its CTA button calls `openValuationModal` directly. The navbar's "Sell" anchor, which pointed at the now-deleted `#vehicle-discovery` id, was repointed to the new section's `#why-sell-to-us` id; "Buy"'s dead `href` (unused since it already opens the Coming Soon modal instead of navigating) was removed from `NAV_ITEMS`, verified safe because `<a href={item.href}>` only renders in the non-Buy branch. No new dependencies were added. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart served 200 with the new section present and both old sections absent, checked against the actual response body.

- 2026-07-05 hero copy/tagline fix, Buy coming-soon modal, Body Type Browse swapped for Flexible Inspection: `Hero.tsx`'s "Fast, Fair & Hassle-Free." line was pulled out of the shared headline clamp into its own smaller, independently-sized `whitespace-nowrap` span so it cannot wrap into a broken shape on any of the required breakpoints (320-1440px+); the "Introducing/CarVibeDubai/Car Buying & Valuation Specialists" identity block from the previous pass was removed entirely per client feedback (kept the codebase's `Section`/`SectionHeader`/typography conventions unaffected). `Navbar.tsx`'s "Buy" item is now a `<button>` (not an anchor, since it no longer navigates) that opens a `fixed inset-0` blurred-backdrop modal at `z-[70]` (above the utility bar's `z-[60]`), with the same Escape-key and body-scroll-lock pattern as `ValuationModal`, implemented with local component state rather than the global custom-event bus since only `Navbar` itself triggers it. `components/public/BodyTypeBrowse.tsx` was deleted (client chose this section, from three candidates, as no longer needed) along with its `bodyTypes` array/`BodyType` type and the now-orphaned `Route`/`BatteryCharging`/`Sparkles` icon imports in `config/homepage.ts`; a new `components/public/FlexibleInspection.tsx` was added in the same page slot, reusing the existing `Section`/`SectionHeader` and hairline-grid-of-cards pattern already used by `BrandBrowse.tsx` (`grid gap-px` cards on `bg-bg/95`) for visual consistency. No new dependencies were added. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart (stale Node processes killed, `.next` cleared) served 200 with the new section present and the old one absent, verified against the actual response body rather than assumed.

- 2026-07-05 thin utility bar, hero identity block, and animated brand marquee: added `components/public/UtilityBar.tsx`, a fixed `h-8` black bar with a gold hairline bottom border sitting above the main `Navbar` (which moved from `top-0` to `top-8`). On mobile the static "English" label is hidden (`hidden sm:flex`) and the phone number text is hidden (`hidden sm:inline`, icon-only) so the bar stays compact and never overflows at 320px; Facebook/Instagram use small inline SVGs (not `lucide-react`, which no longer exports brand glyphs) since a real `<a>` tag needs a working icon rather than a broken import. `Hero.tsx` gained an eyebrow + large `{brand.name}` wordmark + subtitle block ahead of the existing (unchanged) headline/paragraph; the wordmark's `clamp(2.05rem,1.5rem+3.4vw,5.2rem)` sizing was chosen so the 12-character single-word brand name cannot overflow its container even at a 320px viewport (verified by character-width estimate, not just visual guess). Hero top padding grew to `pt-36 sm:pt-40 lg:pt-44` to clear the taller combined utility-bar + navbar stack. `app/privacy/page.tsx` and `app/terms/page.tsx` now render the same `UtilityBar` and had their `<main>` padding changed from `py-16` to `pb-16 pt-36 sm:pt-40` for the same reason — both routes render `Navbar` directly (outside the `(public)` layout group), so they needed the same fix independently. `BrandBrowse.tsx`'s brand-logo grid became an infinite CSS `marquee` animation (new keyframe/animation pair in `tailwind.config.ts`, `mask-image` edge fade, `hover:[animation-play-state:paused]`); the existing global `prefers-reduced-motion` rule in `globals.css` already zeroes all animation durations, so no extra accessibility work was needed for the new animation. No new npm dependencies were added. `npm run lint` and `npm run build` passed; a clean `npm run dev` restart (stale Node processes killed, `.next` cleared) served 200 responses with the expected new markup on `/`, `/privacy`, and `/terms`.

- 2026-07-05 hero revert to search-bar CTA: after client feedback, `Hero.tsx` was reverted from the two-button "buying-desk" layout back to the single search-bar-style `Get Free Valuation` CTA. The Dubai Lamborghini image was kept; the headline grew to `clamp(2.15rem,1.7rem+2.1vw,3.65rem)` (was `clamp(2.05rem,...,3.2rem)` originally) to fix earlier "font too small" feedback, and the section height changed from a forced `100svh`/`88svh` to `min-h-[85svh]` so it reads as a strong band rather than a full-screen wall. The search-bar CTA button now uses responsive `px-4 sm:px-5` padding, `shrink-0` on its icon/pill ends, and `truncate` on the label span so the three-part row (icon, label, pill) cannot force horizontal overflow at 320px width — the label truncates gracefully instead. No new dependencies, requests, or client-side state were added. `npm run lint` and `npm run build` passed; all stale Node dev-server processes were stopped and `.next` cleared before a clean `npm run dev` restart, and the served HTML was checked for the new headline, CTA, and hero image.

- 2026-07-05 buying-desk hero redesign: `Hero` now uses the Dubai Lamborghini portrait photo (`bg-cover`, position `68% 62%` to keep the car visible in wide crops), an 88svh min-height instead of a forced 100svh, and a larger `clamp(2.15rem,1.5rem+2.9vw,4.3rem)` headline. The search-bar-style CTA was replaced with a `buttonClasses()` gold primary button (valuation modal) plus a glass WhatsApp anchor; both keep ≥44px touch height and wrap with `flex-wrap` on narrow screens. A trust row and coming-soon note use flex-wrap layouts to avoid horizontal overflow. `Navbar` actions renamed to `Call Now`/`Message Us`, the `Coming soon` badge moved to `Buy`, and the unused chevron/`ChevronDown` import was removed. No new dependencies, requests, or client-side state were added; the hero image swap reuses an already-shipped local asset. `npm run lint` and `npm run build` passed; dev server returned 200 with the new hero content.

- 2026-07-05 reference-style hero/header refactor: `Navbar` now uses a fixed glass header with a left logo, centered pill navigation, desktop `Book Now`/`Log in` actions, and a small readable `Sell` coming-soon label. `Hero` now uses a search-bar-style `Get Free Valuation` CTA that opens the existing valuation modal without changing the valuation form. Headline sizing was tightened with `clamp()` and a wider text measure to keep the first viewport closer to the supplied reference. No dependencies, new APIs, database requests, or extra image downloads were added. `npm.cmd run lint` passed and `npm.cmd run build` passed. Local preview on `http://localhost:3011/` returned 200 and desktop layout metrics showed no horizontal overflow at the current browser width.

- 2026-07-05 real-photo full-width landing redesign: selected client-provided photos from `public/images/` and copied the chosen set into clean `carvibe-real-*.jpeg` asset names. The public landing now uses full-width visual bands after the hero, with real photos assigned to Vehicle Discovery, Featured Vehicles, Sell Experience, Brand Browse, Body Types, Why Choose Us, Financing, Reviews, Final CTA, Contact, Footer, and the valuation modal. Hero keeps the same content positioning but now uses the Dubai Lamborghini image. No new dependencies, APIs, database requests, or client-side state were added. `npm.cmd run lint` passed and `npm.cmd run build` passed. Local preview on `http://localhost:3011/` confirmed CSS loaded, all main sections were present, and no horizontal overflow appeared at desktop default width or 375px mobile viewport.

- 2026-07-05 premium landing refactor: public landing typography was softened by removing wide/negative tracking from public landing text and shifting visible headings/body copy toward lighter normal-weight treatments while keeping the existing Manrope/Sora font families. The hero now uses private-valuation copy, a tighter desktop buying-desk rail, and existing local hero imagery only. Featured vehicle profiles now use an asymmetrical lookbook grid; brand/body-type sections use flatter divided walls; contact uses a border-led concierge layout. No dependencies, external assets, database requests, or new client-side state were added. `npm.cmd run lint` passed and `npm.cmd run build` passed after rerunning with network access for existing Google font fetching. Desktop preview on an existing local port confirmed the new hero and no horizontal overflow at the default browser width; fresh preview/mobile verification was blocked by the local Windows duplicate `Path/PATH` startup issue and old preview ports returning 404.

- 2026-07-05 brand badge color polish: `components/public/BrandBrowse.tsx` now uses inline SVG fills/strokes that resemble each brand palette instead of global `currentColor` tinting. No image assets, external requests, dependencies, or client-side JavaScript were added. `npm.cmd run lint` passed and `npm.cmd run build` passed after rerunning with network access for existing Google font fetching. Local preview startup was blocked by a Windows duplicate `Path/PATH` environment issue, so browser visual verification was not completed in this pass.

- 2026-07-03 editorial-minimal landing refactor: inverted the design thesis from "premium by decoration" to "premium by restraint." Flattened the body background and removed the ~10 hardcoded per-section near-black backgrounds in favor of one canvas (`--bg`) plus a single elevated panel tone (`--bg-panel`, used only by Financing and the Contact concierge card). Introduced a gold usage budget: gold is now reserved for eyebrow labels + `.gold-rule`, the primary CTA (`.btn-gold`), stat/step numbers, hover/focus, and two `.divider-gold-fade` bookends (final CTA band, footer). Resting borders became white hairlines (`hairline-t`/`hairline-b`, `divide-white/5`) instead of `border-border-gold/*`. Added `tracking-caps` letter-spacing token, `py-section` fluid rhythm, and shared `Section`/`SectionHeader` components (`components/public/Section.tsx`, `SectionHeader.tsx`) plus a `buttonClasses()` export from `components/ui/Button.tsx` to remove ~8 duplicated header layouts and 6 duplicated CTA class strings. Card grids (Brands, Body Types) became hairline-divided grids; repeated content (evaluation profiles, selling steps, trust points, reviews) became borderless numbered/divided lists. Hero kept its layout, photo, and copy — only its eyebrow, stats strip, and assurance chips were restyled to match the new system. Deleted unused `components/public/HowItWorks.tsx` and `CarSkylineArt.tsx` (verified unimported). Verified with `npm run lint`, `npm run build`, and a Playwright pass at 1440px/375px viewports plus modal/mobile-menu interaction checks — zero console errors, zero horizontal overflow.
- Show useful loading, empty, error, and retry states.
- Do not cache private user data publicly.

## Browser targets

When measurement is available, aim for:

- LCP at or below 2.5 seconds.
- INP at or below 200 milliseconds.
- CLS at or below 0.1.

These are targets, not guarantees.

## Completion check

Report:

- Mobile behavior checked.
- Requests added or removed.
- Database-query impact.
- Client JavaScript impact.
- Remaining performance risk.

## 2026-06-30 public landing section polish

- How It Works, Contact, and Footer remain server-rendered public components.
- No new dependencies, requests, or client-side state were added.
- The hero still uses the optimized showroom JPG, but How It Works and Contact now use CSS-led premium panels instead of repeating the same photo.
- Layouts remain one-column on mobile and expand to multi-column panels on larger screens.
- Contact links keep touch targets around 44px or larger.
- 2026-06-30 follow-up check: `npm run lint` and `npm run build` passed after the unique How It Works and Contact redesign; browser checks showed no desktop or mobile horizontal overflow.

## 2026-07-02 Milestone 1 landing revision

- Header keeps the logo on the left and moves the primary desktop header action to WhatsApp on the right.
- Hero now includes Sell a Car active and Buy a Car Coming Soon controls that stack cleanly on mobile.
- Valuation form now starts with contact details, then car details, then condition and inspection area.
- Browser checks on 320px, 375px, and 430px showed no horizontal overflow after the revision.
- No new dependencies or network requests were added.

## 2026-07-02 public header modernization

- Public header now uses a dealership-style two-tier structure: top utility strip for phone/social links and main navigation below.
- Main nav switches to a lighter surface so the logo and links feel more like an established automotive site while the hero remains dark/premium.
- Typography changed from the old serif display feel to modern `Manrope` and `Sora` fonts through `next/font`; no extra client-side JavaScript was added.
- Browser checks showed no horizontal overflow at 320px, 375px, 1024px, and 1440px.
- Mobile menu was checked at 375px and keeps Home, Sell Car, Buy Car Coming Soon, How It Works, Contact, WhatsApp, and valuation actions reachable.

## 2026-07-03 marketplace-style homepage redesign

- Homepage now continues after the hero with vehicle discovery, brand browsing, featured vehicle previews, body-type browsing, immersive sell flow, trust/statistics, financing preview, reviews, and final CTA sections.
- Buy-car, listing, financing, and review areas are UI/request-based previews only; they do not fetch data or claim live availability.
- The new sections stay server-rendered except CTA components that open the existing valuation modal.
- No new dependencies, external requests, or heavy animation libraries were added.
- Browser checks on the fresh preview showed no horizontal overflow at 320px, 375px, and 1440px. Mobile menu was opened and verified at 375px.

## 2026-07-03 premium sell-side refinement

- The redundant post-hero vehicle finder was replaced with a sell-side evaluation showcase, so Milestone 1 now emphasizes what CarVibeDubai can evaluate instead of a future buy-car search.
- Four generated local JPG assets were added under `public/images/` for post-hero vehicle and valuation visuals. Each converted JPG is roughly 150-215 KB, avoiding external image requests and avoiding repeated use of the hero image outside the hero/modal.
- The floating WhatsApp button was removed after mobile verification showed it could overlap narrow-screen content and repeated the same action already available in the hero and contact section.
- Brand and body-type sections are now passive guidance cards instead of extra buttons.
- Fresh preview checks on `http://localhost:3021` showed CSS loaded, no horizontal overflow at 375px and 1440px, no floating WhatsApp overlap, and the mobile menu opening correctly.
## 2026-09-10 Lead detail activity loading

- Lead detail loads its activity timeline immediately while recording a view in
  parallel. It only reloads once if that write creates a new distinct view
  event, avoiding a serial write-then-read delay on every lead open.
- Named view events store a name/role snapshot, so normal timeline reads do not
  need a separate profile lookup to render them.

## 2026-09-10 Sidebar navigation

- Sidebar destinations use Next.js prefetching and keep their dynamic route
  payload in the client Router Cache for 30 seconds. Clicking a prefetched or
  recently visited page paints it immediately without replacing its icon with a
  loading spinner.
- Server-rendered admin screens quietly revalidate 250 ms after they become
  visible. The cached screen remains usable during that refresh, while mutation
  refreshes, focus refreshes, and visible-tab polling keep the existing data
  behavior intact.

## 2026-09-10 Overview comparison readability

- Comparison charts retain their compact responsive layout but use an explicit
hover card that names both matched dates and groups selected versus earlier
values. This avoids asking the user to infer date alignment from slate chart
marks alone.

## 2026-09-13 Purchaser inspection workspace

- The workspace becomes one column on phones and adds columns only where space
  permits. Native `capture="environment"` inputs open the phone rear camera.
- Each of the 22 image uploads is bounded to 8 MB; read access signs all stored
  paths in one batch rather than making 22 serial URL requests.
- Every photo requirement uses plain-language angle text and an inline capture
  guide. Its Add photo dialog offers a deliberate choice between the device
  camera and an existing file, avoiding ambiguous browser-picker behavior.
- A contained, scrollable Photo folder gallery lets the inspector review all
  saved photos in one place. It reuses the already-authorized signed URLs and
  does not issue a new request per thumbnail.
- The eye icon opens the selected photo in an in-page, contain-sized preview
  modal. It does not navigate away or open another browser tab; the folder
  remains the option for reviewing the complete set.
- Private photos use direct `<img>` rendering through an authorized same-origin
  endpoint, so the public Next image optimizer never proxies private Supabase
  storage and previews do not expire while a report is open. The preview is
  contain-sized to avoid layout growth and failed loads show a clear recovery
  message.
- The photo viewer keeps a compact `current of captured` title and Previous /
  Next controls. It navigates only among saved photos, so staff never land on
  an empty required slot while reviewing the folder.
- While the viewer is open, desktop keyboard Left / Right keys and a deliberate
  50px horizontal swipe on touch devices use the same saved-photo navigation.
  Vertical scrolling remains available on touch screens.

## 2026-09-13 LAN development protocol

- The CSP `upgrade-insecure-requests` directive is enabled only for production.
  A network development server at `http://<local-ip>:3000` has no TLS
  certificate, so upgrading its CSS, JavaScript, and image requests to HTTPS
  causes `ERR_SSL_PROTOCOL_ERROR` and an unstyled page.

## 2026-09-13 Inspection PDF feedback

- Completed inspection PDFs use an authenticated internal binary response with
  no PDF attachment header. The page waits with an indeterminate preparation
  bar, validates the complete `%PDF-` payload, then saves a local Blob. This
  prevents expired third-party download managers from hijacking the API request
  while retaining a normal direct-download response for other consumers.
- Private photo retrieval is batched four at a time, avoiding 24
  serial storage waits while keeping memory and storage concurrency bounded.
- The PDF is generated only after completion and is not bundled into the public
  valuation form.
- The report uses a white A4, low-ink layout based on the approved reference:
  a compact CarVibeDubai identity sits at upper-left, pages avoid heavy background decoration,
  and all 24 photos are contained without cropping or stretching. Normal reports
  use three data pages plus five photo pages; failure notes add pages only when
  there is real content to preserve.
- Required-photo cards are one column on small screens and two columns from
  tablet widths, with touch-sized actions and one responsive camera/upload dialog.

## 2026-09-23 catalog activity and inspection alerts

- Vehicle Catalog activity is not requested until the owner opens the history
  drawer. The drawer fetches 10 records at a time; search is debounced and more
  history is fetched only through See more or near-bottom scrolling.
- The notification menu is bounded and scrollable on small screens. It fetches
  on page focus rather than polling, so normal dashboard use does not create a
  continuous request stream.

## 2026-09-24 Scrap inquiry flow

- Scrap uses the existing responsive valuation modal and three-step vehicle
  controls rather than a second heavy form bundle. The additional condition and
  asking-price fields remain stacked and touch-safe on small screens.
- Incomplete Forms uses small touch-safe type filters over the existing server
  response; no second Scrap-only list or unbounded client fetch is introduced.
- Scrap origin markers use one compact, no-wrap badge component across desktop
  and mobile lists so the label does not collide with car details or status
  pills at narrow widths.

## 2026-09-25 Mileage input

- Public valuation and Scrap forms use a compact two-control Mileage row:
  whole-number input plus a fixed KM/Miles selector. It remains a two-column
  control inside the existing mobile-safe vehicle-details layout and exposes a
  clear whole-numbers-only hint.
