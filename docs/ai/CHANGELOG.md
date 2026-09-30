# CHANGELOG.md

Use reverse chronological order.

## Unreleased

### Added

- **Temporary no-OTP public submissions (local, not deployed).** Free Valuation and Scrap Inquiry can submit directly with server-side validation, unverified-number marking, blocked/open-lead checks, and retry idempotency. The WhatsApp OTP path remains reversible. No schema migration or customer-data reset was needed; staging/mobile checks remain before release.

### Fixed

- **Referral commission clarity.** Referral incentives are now separated from
  closed-car commission rows: invoices show the referral amount and customer
  count beside the invoice details, while the dashboard Details modal uses a
  compact header action with an on-demand referral breakdown popup. Search and
  progressive loading appear only when more than ten referrals exist.

- **Inspection completion status refresh.** Final inspection completion now
  verifies the lead is actually moved to `Inspected`, reconciles an older
  deployed completion function if necessary, and refreshes the Leads store
  before returning to the customer record. Existing completed reports that
  were left at Inspection Scheduled are repaired safely when their lead opens.

- **Inspection photo upload feedback.** Added a real upload progress bar,
  secure-save status, immediate JPG/PNG and 8 MB validation, and clearer
  interrupted-upload errors. The existing private storage and 24-photo rules
  are unchanged.

- **Commission row actions.** Removed the repeated row-level Invoice and
  payment buttons. Each row now has one Details action; invoice download and
  Mark as Paid remain inside Details. Paid rows show their status without an
  unnecessary payment action.

- **Commission page clarity.** Separated Staff Commissions from the Developer
  Quarterly Share, clarified unpaid versus paid labels, and added a combined
  payout summary so the AED 1,080 staff total and AED 180 developer share are
  not mistaken for one another.

- **Scrap badge styling.** Standardized Scrap origin markers across Leads,
  Incomplete Forms, and Inventory with a compact gold-themed recycle badge that
  remains readable on desktop and mobile.

- **Scrap origin missing from the Leads tab.** Recovered Scrap leads now keep
  their `Scrap Inquiry` label through the server role projection, including
  desktop and mobile Leads views. The Leads API fallback also retains Scrap
  origin fields when only scheduling columns are unavailable.

- **Scrap section duplication.** The regular Leads tab now excludes Scrap
  records; Scrap records appear only under Scrap Inquiries. Sidebar selection
  also correctly highlights the active section when the Scrap filter is open.

- **Incomplete Scrap recovery.** A Scrap form with a valid name and phone now
  remains in Incomplete Forms when a visitor leaves before OTP verification.
  Call Centre sees a clear Scrap badge/filter and captured Scrap context;
  type-aware duplicate protection prevents an existing valuation from hiding a
  genuine Scrap enquiry for the same phone. Requires migration
  `0035_incomplete_scrap_inquiries.sql` after `0034`.

- **Call Centre commission privacy and branch address.** Call Centre accounts
  now see only their own commission, related customer/car, and sold date;
  company profit is removed from their page, details, API response, and invoice.
  The public branch and inspection-report address now state Al Quoz, Dubai, UAE.

- **Catalog history, appointment change audit, and commission consistency.**
  Vehicle Catalog history now loads only when opened, searches all recorded
  catalog context, and fetches more in small pages. Inspection reschedules are
  recorded with before/after values and support private Super Admin/Owner plus
  assigned Purchaser alerts after the tracked database migration is applied.
  Purchaser Inventory now reads the same frozen unpaid 10% ledger amount as
  the Commission tab and no longer exposes Call Centre or Developer shares.
  Zero-commission staff no longer receive an invoice action, the sale modal
  hides the Developer share, and staff invoice PDF columns no longer overlap.

- **Responsive Topbar Emblem Mode, Zero Horizontal Page Scroll & Streamlined Entity Views.** Hidden the `"CARVIBEDUBAI"` wordmark text in the admin header on mobile, tablet, and smaller laptop screens so only the circular gold emblem is displayed, completely eliminating header crowding and profile avatar cutoff on narrow viewports (e.g. 440px iPhone 16 Pro Max). Enforced `overflow-x-hidden max-w-full` across the admin shell and redesigned the Executive Dashboard Date Filter to prevent horizontal page scrolling. Extended the streamlined mobile list view across mobile to medium screens (<1024px) for the Leads Directory (Client Name priority) and created `MobileInventoryList` for the Inventory Directory (Car priority with direct tap-to-details), reserving heavy multi-column tables for desktop screens. Refactored Inventory components to keep `inventory-client.tsx` strictly under 500 lines.

- **Vehicle Catalog stopped accepting entries during long editing sessions.** Successful Make, Model, and Trim inserts now update the local catalog instead of depending on a second full-catalog request. Expired sessions are identified clearly, rapid duplicate submissions are blocked, duplicate entries show a contextual toast, catalog names are validated on both client and server, and large make lists are paginated at 15 models per page.

- **Admin overview nested scrolling.** Removed the fixed-height nested vertical
  scroll container from the shared admin shell. Admin pages now use the single
  browser-level scrollbar, while the top bar stays sticky and dashboard
  component behavior is unchanged.

- **Business Overview navigation and rendering performance.** Removed `force-dynamic` from `/admin` page shell so the client router transitions instantly without blocking on a server roundtrip. Optimized layout cookie checks to bypass redundant JWT decoding on sidebar clicks. Replaced 6 staggered dynamic chart imports with direct bundling in `ExecutiveDashboard` to eliminate waterfall chunk requests and cascaded re-render layout thrashing. Added Stale-While-Revalidate memory caching so navigating back to the Business Overview displays existing metrics instantly (0ms latency) while refreshing in the background.

- **Clean git author and zero-personal-identity verification for deployment.** Configured repository local git author and committer to pure carvibe025 (carvibeduba025@gmail.com). Sanitized database seed and test mock data to remove developer names and personal emails, verifying 0 personal occurrences across 600+ project files prior to online publishing.

- **Lead Notes History & Activity audit UI.** Redesigned the Notes History modal and Activity timeline on the Lead Detail view. Replaced ambiguous numbered circle badges with clear revision status badges (`Latest Note` vs `Revision #...`), elevated author and role visibility, added high-contrast timestamps with dedicated clock icons, and enclosed note contents in structured message bubbles with strict word-break wrapping (`break-all`, `[overflow-wrap:anywhere]`) so unbroken text never blows out horizontal layout on mobile or desktop. Added `min-w-0` to grid columns to prevent CSS grid width distortion.

- **Faster Dashboard first interaction.** Deferred the heavy chart library until after the Dashboard shell and KPI/action cards render, reducing the Dashboard route's initial JavaScript from roughly 85 KB to 50 KB while preserving all chart behavior.

- **Repeated sidebar loading delay.** Removed an automatic second server refresh that ran 250ms after many admin pages opened, so a prefetched navigation no longer immediately re-renders and appears to load twice.

- **Local chunk-loading failures.** Rebuilt the generated Next output after removing conflicting local Next.js servers. The app now runs from one fresh production server on port 3000, preventing stale page chunks from being requested from an older server.

### Added

- **Auditable editable vehicle inspections.** Purchasers can start an arrived
  customer's inspection, save changes card by card, and continue editing a
  completed report alongside Super Admin. The inspection records card and
  photo actions with actor/time details, requires notes for all 24 photo views
  (including dedicated front- and rear-bumper photos), and shows the history
  in a right-side drawer.
- **Inspection VIN search and photo retention.** Inventory can search and show
  Chassis Number / VIN Number. A protected daily job removes inspection images
  60 days after a vehicle is sold while retaining report data and audit history.
- **Updated inspection PDF.** The eight-page, print-friendly report includes
  the CarVibeDubai logo, all 24 images, and photo notes without stretching.

- **Live Presentation Demo Dataset & Safe Reset Utility.** Seeded a demo dataset in Supabase matching the exact scenarios, vehicle models, and numerical formulas in `carvibe-dashboard-walkthrough-script.pdf` and `carvibe-admin-dashboard-demo-script.pdf`. Covers the 8.1% margin calculator showcase (AED 170k purchase / AED 185k sale), Section 11 role-commission breakdown (Bentley Continental GT with AED 100 Call Centre, AED 500 Purchaser, AED 100 Developer), 3 unsold showroom cars with 95-day slow-stock trigger (AED 370k capital tied up, 1 car >90 days), 5 incomplete forms (including Anna with 2022 BMW), and August 2026 / 2025 comparison benchmarks. Included standalone wipe script `scripts/wipe_demo_data.mjs` that resets demo data without modifying user accounts or settings.

- **Production Super Admin Manual.** Added a plain-white, Arial-based operations manual covering the complete Super Admin workflow without developer, demo, local-environment, or secret-management instructions.

- **Dashboard formula coaching.** The Dashboard walkthrough-only PDF now includes plain-language formulas and a two-sale scenario for all money, stock, comparison, and data-quality calculations shown in the overview.

- **Dashboard walkthrough-only script.** A separate color-coded PDF now provides one natural presentation script for the entire Business Overview, including direct explanations, examples, and distinctions between related Dashboard metrics.

- **Cleaner new-lead email.** Website valuation notifications now contain only captured valuation information; they no longer show an empty customer-email placeholder.

- **Clear Inventory Overview coaching.** The demo script now explains the difference between money in unsold cars, average age of current stock, and the 90-day slow-stock warning with a practical scenario.

- **Owner-managed new-lead email.** A verified website lead is stored first, then sent through server-only Gmail SMTP to the current Notify email in Settings. Super Admin can save a new recipient and use **Send test email** to validate the currently saved destination.

- **Attributed follow-up history.** Saving a Follow-up note keeps the latest note in the customer record and preserves the saved version in Activity with its timestamp plus the authenticated CSR, Purchaser, or Super Admin name and role. Status updates receive the same attribution.

- **Lead Detail & Incomplete Form Workspace Alignment (Email Removal & Space Balance).** Redesigned customer record workspaces (`/admin/leads/[id]` and `/admin/incomplete/[id]`):
  - Aligned strictly with the CarVibe brand theme: deep frosted black backgrounds, hairline borders, and warm gold accents.
  - Completely removed email field from Customer Contact card across all lead workspaces.
  - Replaced 2-column contact cards with balanced, compact direct phone sections featuring a 1-click clipboard Copy button (`Copied ✓`) and direct WhatsApp and Call buttons, eliminating awkward empty spaces.
  - Aligned the Incomplete Valuation (`PartialLeadDetail`) screen with the same unified 2-column layout (Captured details + Contact + Timeline on left; Assigned team + Follow-up/Conversion/Actions on right).
  - Preserved 100% of functional requirements, form state, validations, and API integrations with zero logic changes.
  - Modularized components (`PartialLeadCapturedCard.tsx`, `PartialLeadActivityCard.tsx`, `PartialLeadConversionFields.tsx`, `LeadContactCard.tsx`) keeping all files strictly under the 500-line limit mandated by Rule 1.

- **Assigned-team follow-up notes.** Call Centre staff and Purchasers can read the Notes field for leads assigned to them, so the latest call outcome and next action survive the workflow handoff. Server-side row scoping still prevents access to another staff member's lead.

- **Focused lead activity history.** The lead detail Activity card now shows the five newest events first. When older activity exists, `See full details` opens the complete newest-first timeline in a contained, scrollable dialog that keeps approximately ten rows visible at once.

- **Simple, fair Dashboard comparisons.** The dashboard now starts with plain choices: Previous Period, Same Time Last Year, or an optional custom earlier period. Dates are calculated automatically to the same length as the primary Dashboard selection. Changing the primary date filter clears the old comparison, preventing misleading one-day-versus-month results.

- **Distinct Lead Pipeline dashboard card.** Replaced the duplicated Follow-up Status card with New Leads, Contacted, Inspection Scheduled, Under Negotiation, and Deals. Each stage now opens the Leads Directory with that stage selected, while Needs Attention remains the dedicated urgent-action list.

- **Super Admin Commission multi-select.** Commission now opens with All selected. The checkbox filter can show any combination of Agents, Purchasers, and Developer statements. Mixed staff rows visibly state their role and rate, while Pay always uses the selected staff member's stored role instead of the current filter.

- **Correct live-week Overview filter.** Selecting This Week now passes the actual UAE seven-day range to the dashboard instead of retaining the Today range behind a This Week label.

- **Frosted Pitch-Black Glassmorphism Topbar & Navigation.** Replaced the admin Topbar and Sidebar styling with a deep, pitch-black frosted glass aesthetic (`bg-black/85 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.85)]`), frosted ice hairline accents, luxury user profile pill with amber avatar badge, and frosted glass dropdown menu.

- **Dashboard Performance & Lag Elimination.**
  - Removed GPU-heavy `backdrop-blur-md` from nested `<Card>` components, switching to high-performance deep dark surfaces (`bg-[#0c0c0f] border-white/[0.08]`) that eliminate compositing lag during scrolling.
  - Implemented an in-memory client cache (`overviewCache` in `use-executive-overview.ts`) for instant, 0ms date range toggling between "Today", "This Week", and "This Month".
  - Disabled blocking Recharts frame-by-frame SVG animations (`isAnimationActive={false}`) across all 6 dashboard charts for instant rendering.
  - Aligned initial seed range and date filter state to avoid redundant re-fetches on initial mount.

- **Smoother admin navigation.** Removed the sidebar loading spinner and made prefetched or recently visited admin pages paint immediately from a 30-second client route cache. Server-rendered data then revalidates quietly without blocking navigation; mutations and live refreshes keep their existing behavior.

- **Faster lead activity loading.** Lead detail now loads Activity in parallel with the audit-view write and refreshes only after a newly recorded view. Normal named view events avoid an unnecessary profile lookup.

- **Named lead-view activity.** Every distinct agent or purchaser view is now recorded with the authenticated staff name, role, and timestamp, and appears in the shared Activity timeline. View events are access-controlled and deduplicated per viewer.

- **Duplicate-pair review.** The Duplicate Leads attention view now includes both the flagged repeat submission and its earlier matching submission, with visible labels that explain which is which.

- **Accurate inactive-assignee display.** The read-only Assigned Team card includes inactive staff records and labels them `(inactive)`, so an existing assignment never appears as `Unassigned` just because the staff account was disabled.

- **Read-only lead ownership for Super Admin.** Replaced editable Call Centre and Purchaser assignment dropdowns in completed and incomplete lead detail pages with an always-visible Assigned Team card. It shows the assigned staff member or `Unassigned`; workflow assignment is no longer editable from these detail screens.

- **Operational Alerts & Attention-Focused Navigation UX Overhaul.**
  - **Clickable Dashboard Panels**: All items in "Needs attention", "Follow-up Status", and "Record Check" (`ExecutivePanels.tsx`) are now interactive clickable links with chevrons, hover effects, and target query parameters (`?attention=...`).
  - **Dynamic Attention Filters in Leads Directory**: `useLeadsFilter` and `LeadsTable` dynamically filter leads when redirected from dashboard alerts:
    - `first-contact`: Filters new/pending leads waiting >24h.
    - `stalled`: Filters open leads with no activity for 3+ days.
    - `missing-car`: Filters leads submitted without make, model, or year.
    - `duplicate`: Filters duplicate lead submissions.
  - **Prominent Attention Filter Banners**: Renders a rich glassmorphic status banner at the top of `/admin/leads`, `/admin/inventory`, `/admin/incomplete`, and `/admin/commission` showing the exact issue, matching count, and a one-click `Clear attention filter ✕` button to restore full views.
  - **Inventory Aging Deep-Link**: Navigating from "Cars waiting too long" automatically unconstrains month filters and highlights unsold inventory older than 90 days.
  - **Normal Navigation Preserved**: When entering sections normally via sidebar, attention banners remain hidden and default views are untouched.

- **Clear, non-overlapping follow-up buckets.** Leads waiting for first contact are no longer also counted as needing a later follow-up. The Overview states this directly, and its commission record check only evaluates cars sold during the selected date range.

- **Single-Day / "Today" View Executive 2-Card Layout Upgrade.**
  - Replaced the single-point Cartesian coordinate charts in `VisitorsChart` and `SubmissionsChart` (which left an empty grid with 1 solitary bar) with an Executive 2-Card Layout that matches `FinancialTrendChart`:
    - **Website Visitors (`VisitorsChart.tsx`)**: Card 1 displays **Daily Traffic Volume** (Large Cyan session counter, date pill, unique sessions logged) and Card 2 displays **Lead Conversion Rate** (visual progress bar, conversion % badge, inquiries-to-visitors ratio).
    - **Car Submissions (`SubmissionsChart.tsx`)**: Card 1 displays **New Valuation Inquiries** (Large Amber request counter, date pill, direct seller submissions) and Card 2 displays **Lead Intake Rate** (traffic-to-lead efficiency gauge, active pipeline flow, inquiries count).
    - Preserves multi-day AreaChart and BarChart representations when selecting multi-day periods.

- **Executive Overview Comparison UI/UX & Visibility Overhaul.**
  - **Dual-Date Comparison Banner**: Implemented a glassmorphic amber banner in `ExecutiveDashboard` displaying `Active Comparison Mode: Primary Range: [From] → [To] vs Comparison Range: [From] → [To]` with an instant one-click reset (`Clear comparison ✕`).
  - **Side-by-Side KPI Card Metrics**: Upgraded `ExecutiveKpiCard` to display both primary and prior values (e.g., `AED 345,000` with `Prior: AED 240,000 (+43.8%)`, `AED 26,500` with `Prior: AED 21,500 (+23.3%)`, `3` with `Prior: 2 cars (+50.0%)`, `AED 580` with `Prior: AED 580 (0.0%)`).
  - **Sales & Profit Dual Comparison Series**: Added `Revenue (Comparison)` in muted slate `#64748B` alongside amber bars and `Gross Profit (Comparison)` as a dashed `#94A3B8` line alongside the emerald profit curve in `FinancialTrendChart`.
  - **Funnel Paired Series & Legend**: Added explicit period legends and side-by-side comparison bars for the 8-stage conversion funnel in `PipelineFunnelChart`.
  - **Chart Count Calculation Fixes**: Fixed visitor and lead submission aggregation bugs in `VisitorsChart` and `SubmissionsChart` so primary counters only reflect the selected timeframe while cleanly presenting comparison totals in badges and legends.
  - **Architecture Rule 1 Compliance**: Modularized `FinancialTrendChart` into `components/admin/FinancialTrendChart.tsx` ensuring all files stay strictly below 500 lines.

- **Full Overview comparison mode.** The selected comparison range now loads its own complete dashboard data. Financial cards retain percentage changes; the Lead Journey uses paired bars, Visitors and Car Submissions show a gray comparison series, and inventory/staff charts show clear comparison totals. Operational alerts remain explicitly scoped to the selected period because they are live-status checks.

- **Plain-language Executive Overview copy.** Replaced technical inventory and performance wording with practical labels and explanations, without changing any calculations or data shown.

- **Executive Dashboard UI/UX & Chart Visibility Overhaul.**
  - **High-Visibility Gross Profit & Dual Y-Axis**: Enhanced `FinancialTrendChart` with dual Y-axis scaling (Revenue on Left, Gross Profit on Right) and vibrant Emerald styling so gross profit values are prominent and never dwarfed by revenue. Added a Gross Margin % header pill.
  - **Single-Day / "Today" View Fixes**:
    - Revenue & Profit: Executive 2-column comparison layout with luxury Amber and glowing Emerald cards, clear values, and margin percentages.
    - Website Visitors: Replaced 1-point empty AreaChart with a glowing Cyan `#0EA5E9` bar column and top count label.
    - Car Submissions: Added `maxBarSize={48}` to prevent full-width stretching, with Amber gradient and count badge.
  - **Intuitive Multi-Color Palette & Legends**:
    - Progressive 8-stage chromatic conversion funnel (`PipelineFunnelChart`) with retention percentage badges.
    - Operational urgency inventory aging palette (Emerald, Sky Blue, Amber, Coral Red) with center vehicle counter.
    - Tri-color staff performance series (Indigo, Amber, Emerald) with role selector dropdown (`All Roles`, `Agents Only`, `Purchasers Only`).
  - **Tooltip & Axis Contrast Polish**: Fixed low-contrast dark-on-dark text in Recharts tooltips (`Count : X (Y% retention)`) with explicit bright `#F3F4F6` text and pure white labels; boosted axis tick contrast to `#D1D5DB`.
  - **Cool Glassmorphism Aesthetic**: Removed gold-tinted box-shadows from all cards and `.card-shadow`, replacing them with sleek neutral glass borders (`border-white/10`) and subtle depth (`bg-[#141417]/80 backdrop-blur-md`).
  - **Natural Typography & Brand Alignment**: Replaced oversized geometric bold fonts that felt like generic AI templates with CarVibe's native `font-sans` (`Manrope`). Decoupled the `AED` currency prefix into a subtle, smaller indicator (`text-xs sm:text-sm font-semibold tracking-wider text-[#a39c90]`), balanced Gross Profit numerals with soft emerald tones while keeping currency prefixes clean, and aligned card labels to Title Case / crisp tracking.
  - **Executive KPI Cards**: Elevated with luxury icon avatars (Coins, TrendingUp, CarFront, WalletCards), accent colors, margin badges, and clean borders.
  - **Secondary Cards**: Added icon pills and urgent alert styling for inventory watch (>90 days).
  - Preserved 100% of existing business logic, calculations, and data endpoints.

- **Executive Overview dashboard.** Rebuilt the owner Overview into a CEO-focused bento dashboard using existing financial, staff, lead, inventory, and event records. Added custom comparison ranges, financial and operational charts, inventory aging, assigned-lead staff performance, alerts, and data-quality summaries.
- **Disabled Account Security Guard.** Gated `POST /api/admin/login` and `middleware.ts` against disabled staff accounts (`is_active: false`). If an account has been disabled by the owner, any sign-in attempt is rejected with HTTP 403 status and displays an explicit alert message: `"Your account has been disabled by the owner."` Any active session for a disabled account is immediately terminated and redirected to the login screen.
- **Agent & Purchaser Lead Assignment Fix.** Fixed staff ID resolution in `lib/admin/leads-store.tsx` so Agent 1 (oldest account in line) and subsequent round-robin assigned agents/purchasers immediately see their assigned customer leads on their dashboard across all environments.
- **Dynamic Role Header Tag.** Updated topbar header next to logo to display the exact role title: `| Call Center Agent`, `| Purchaser`, or `| Super Admin`.
- **Restored & Expanded Tabs for Agents and Purchasers.**
  - **Call Center Agent**: Leads, Commission, Incomplete Forms, Blocked Numbers, Settings.
  - **Purchaser**: Leads, Inventory, Commission, Settings.
- **Personal "My Commission" View.** Agents and Purchasers see a personal "My Commission" screen listing their own closed deals, total profit, 2%/10% commission earnings, and downloadable PDF invoice statement (`carvibedubai.pdf`). Super Admin maintains full multi-tab management view across all staff and developer statements.
- **Overview Historical Backlog & Time-Machine Date Filtering.** Allows administrators to backlog and backtrack all metrics across any timeframe (Year, Month, and Week/Day ranges e.g. Days 1–7):
  - Fast presets: `Today` (default view), `This Week`, `This Month`, `Last Month`, `All Time`, and `Custom Backlog`.
  - Backlog drilldown: Year selector (2024+), Month selector (January–December or Full Year), and Week/Day range selector (Days 1–7, 8–14, 15–21, 22–28, 29–end, or custom Day X to Y).
  - Pipeline stage counters (New, Pending, Contacted, Inspection Scheduled, Inspected, Under Negotiation, Deal, Not Purchased) and engagement metrics (Message Us clicks, Call Now clicks, Incomplete forms, and Visitors) recalculate to match the selected historical window.
  - Interactive charts (`Website Visitors` AreaChart and `Car Submissions` BarChart) plot daily data points across the exact selected range.
  - Recent Leads synchronize with the selected timeframe.
  - Bounded to UAE calendar day / timezone rules via `lib/uae-time.ts`.

- **WhatsApp OTP emergency circuit breaker.** `WHATSAPP_OTP_SENDING_ENABLED=false` stops `/api/otp/send` before it can parse a request, create an OTP record, or call Meta. The valuation form shows a temporary-unavailability message instead of treating this intentional shutdown as its local demo fallback. Focused tests prove the Meta sender is not called while the switch is off.
- **Milestone 3 Phase 2 — monthly commission statements.** New `/admin/commission` screen: the developer's 2% recorded per calendar month and grouped into quarters for payment, exactly as the brief words it ("keep a monthly record… prepare a summary for payment every three months"). Quarters are derived from their months rather than stored, so a quarter total can never drift from what it is made of. Issuing a quarter locks its sales — a car sold later and backdated into a settled month goes onto the next open month instead of silently changing a figure already sent. Migration `0016_commission_statements.sql` with `build_commission_statement()` (idempotent, skips issued/paid months) and `set_commission_statement_status()` (forward-only).
- **The two pipeline stages named in the client's brief:** `inspection_scheduled` ("Inspection Scheduled") and `negotiating` ("Under Negotiation"), migration `0015_pipeline_statuses.sql`. "Contacted" previously covered both "left a message" and "meeting them Thursday"; "Inspected" covered both "seen it" and "still haggling". `closed` is now labelled "Not Purchased" to match the brief.
- `npm run build:check` — a verification build that writes to `.next-build` instead of `.next`, so it cannot break a running dev server (`KNOWN_ISSUES.md` ISSUE-006). `next.config.mjs` now reads `distDir` from `NEXT_DIST_DIR`.
- Milestone 1 meeting pack for the July 12 client meeting: `docs/meetings/Milestone1_Report_2026-07-12.md` and `.docx`, including a natural speaking script, live demo walkthrough, and likely non-technical client question scenarios.
- Hero focus-in animation (`hero-focus` and `hero-rise`) so the approved hero image and copy sharpen into view on first load.
- Lightweight `PageIntro` wrapper for a fast opacity-only page reveal.
- New `components/public/FinalCta.tsx`, extracted from the old `ReviewsAndFinalCta.tsx` to preserve the real "Your next car decision is closer than you think" closing CTA after the placeholder reviews block was removed.
- New scroll-triggered background-video section (`components/public/FooterVideoBand.tsx`) right before the footer, using the client-supplied `public/videos/footer.mp4` (relocated from `components/ui/footer.mp4`, which Next.js cannot serve). Muted, no controls, no loop, plays only while scrolled into view (`IntersectionObserver`), with a large `{brand.name}` wordmark blended over it via `mix-blend-overlay`.
- New `SellerAssurance` section (`components/public/SellerAssurance.tsx`), placed right after the hero: "Why Sell To CarVibeDubai" with three assurance points (fair market-based offers, full transparency, balanced mutual-agreement negotiation) and a "Get Your Free Valuation" CTA, backed by a new `sellerAssurances` config array.
- New `FlexibleInspection` section (`components/public/FlexibleInspection.tsx`) explaining that CarVibeDubai can inspect the car at the seller's location or meet halfway, backed by a new `inspectionOptions` config array. Replaces the removed Body Type Browse section in the homepage flow.
- New thin `UtilityBar` component (`components/public/UtilityBar.tsx`): a persistent black/gold hairline strip fixed above the main navbar with a static "English" label, a `tel:` phone link, and Facebook/Instagram icon links sourced from `config/brand.ts`. Rendered on the home page, `/privacy`, and `/terms`.
- A large brand-identity block in the hero ("Introducing" eyebrow + big `{brand.name}` wordmark + "Car Buying & Valuation Specialists" subtitle), matching the composition of a supplied premium automotive reference while keeping the existing headline/paragraph copy and font family unchanged.
- An animated infinite-scrolling logo marquee for the "what we buy" accepted-brands section (new `marquee` keyframe/animation in `tailwind.config.ts`), replacing the static logo grid.
- Clean selected real-photo landing assets under `public/images/carvibe-real-*.jpeg` for hero, valuation, process, vehicle profiles, body types, trust, financing, contact, reviews, final CTA, footer, and valuation modal visuals.
- Generated local JPG assets for premium vehicle/valuation visuals used after the hero.
- Marketplace-style homepage sections for vehicle discovery, brand browsing, featured vehicle previews, body-type browsing, selling experience, trust/statistics, financing preview, reviews, and final CTA.
- Simple AI development documentation setup.
- Client milestone package under `docs/client/`, including a proposal-aligned message, editable milestone plan, HTML, RTF, and PDF.

### Changed

- **A page view is recorded once per visitor, per page, per UAE day — not on every click.** A row was written on every route change and every reload, so one person refreshing the landing page twenty times wrote twenty rows. The visitor *count* was never wrong (it collapses rows by visitor id), but the table grew at the rate people click rather than the rate people arrive, and every dashboard read had to scan all of it. Deduped per `(visitor, path, UAE day)` in `localStorage`: refresh ten times → 1 row; then read Privacy and Terms → 2 more; come back tomorrow → recorded again on the new day. Kept per-path rather than one row per visitor because `path` is the only thing that could ever answer "which pages do people read" — collapsing further would save a little more and throw that away permanently.
- **The chart query no longer over-fetches 20 hours of rows on every load.** Its lower bound was built from the day *key* (a bare date) as `"<key>T00:00:00.000Z"`, but a UAE day opens at 20:00Z — so every request pulled an extra fifth of a day of events across the network only to discard them for matching no bucket. The window builder now carries the true UTC instant.
- **The day-window logic moved into `lib/uae-time.ts` and is now tested.** "Visitors today" and the last point of the 7-day chart come from two separate queries; nothing stopped them drifting apart except their windows being identical, which was true by coincidence rather than by construction. `buildLastSevenUaeDays()` is now the single source, and four new tests pin the guarantee down — including that at 00:00:30 UAE the stat reads zero while the previous day still holds the figure it closed on. 67 → 71 tests.
- **The visitor stat now counts today, not a rolling week.** `visitorsThisWeek` counted distinct visitors over a rolling 7×24h window, so it never returned to zero — it slid, dragging six previous days along with it. It is now **`visitorsToday`**, bounded by the UAE calendar day, the same boundary `newToday` already uses for leads, so both daily figures on the Overview agree about when a day starts and both reset at UAE midnight. Renamed rather than quietly re-scoped: a field whose name says "week" while it counts a day is how a dashboard gets read wrong, and the old name is now a compile error at every call site. Verified against live data — the same events gave 4 under the old window and 2 under the new one.
- **The Overview refreshes itself on arrival, not just on focus.** It is server-rendered and the App Router caches that render, so it could report figures that had been true some minutes earlier with nothing on screen admitting it. `router.refresh()` now runs on mount as well, so the numbers are current by the time they are read.
- **Both Overview charts show their scale and their latest value.** They ran with `<YAxis hide />` and `margin.right = 0`, which made every figure readable only by hovering and clipped the newest day — the one people look at first — against the right edge. They now have a recessive integer y-axis, room at the right, a direct label on the most recent point only (per the project's dataviz guidance: never a number on every point), and an explicit empty state, because a flat line pinned to the baseline is indistinguishable from a broken chart.
- **Visitor identity moved from `sessionStorage` to `localStorage`, so a visitor is a person rather than a browser tab.** `sessionStorage` is scoped to one tab and discarded when it closes, so opening the site in a second tab created a second "visitor", and coming back the next day created another — one person visiting on Monday, Wednesday and Friday counted as three. Visible in the live data: **14 page views had produced 12 distinct ids**, several arriving within the same second. `localStorage` persists across tabs and visits, so counting distinct ids over a window now answers how many *people* came rather than how many times a tab was opened. Verified end-to-end against the production build: three simulated people opening six pages between them recorded 6 rows and counted **3** visitors (the old counting would have said 6).
- **Removed the "Admin" link from the public footer.** It advertised the existence and exact location of the staff login to every visitor and crawler. To be clear about what this buys: the dashboard is protected by Supabase Auth and `middleware.ts`, not by its URL being unknown — this cuts down drive-by scanning, it is not a security control, and `/admin/login` still answers when requested directly.
- **The middleware makes no network calls at all on a normal navigation.** The `must_change_password` lookup was the last one left, and it ran on every admin page load — a guaranteed round trip to re-answer a question whose answer had not changed since the click a second earlier. It is now answered once and cached in a short-lived `cvd_pw_checked` cookie holding the **user id**, so a cookie from another account cannot satisfy it. The cookie grants nothing: access is still decided entirely by the verified JWT, and all it skips is a UX redirect. Cached only when the answer is "no", so setting a password takes effect immediately. Trade-off: flipping `must_change_password` back to true for an already-signed-in account takes up to an hour to apply.
- **The Overview's charts load on demand, cutting the dashboard's JavaScript in half.** `recharts` is ~105 kB and is used by `VisitorsChart` and `SubmissionsChart` and nowhere else, but was imported statically — making `/admin` **223 kB** of First Load JS against 102–116 kB for every other admin screen, so the most-visited route was both the slowest to compile in development and the slowest to become interactive in production. Loaded through `next/dynamic` the route drops to **3.81 kB / 114 kB** — a 96% cut in route size — and the stat cards and Recent Leads now paint without waiting for a charting library. The placeholder is the chart's own shell at its own height, so nothing shifts when the charts arrive.
- **Removed `framer-motion`.** Confirmed with a repo-wide search across every file type that it was not imported anywhere — it was a dependency being installed and resolved for nothing.

### Fixed

- **Marking a lead as a Deal did not show the car as owned in Inventory — a regression from the Server Component move.** Inventory said "Cars owned 0 · Capital tied up AED 0" while the database held two `in_stock` cars worth AED 121,111. Cause: those screens fetched their data on mount before, which was always fresh by accident; as Server Components their rendered payload is held in the App Router's client-side cache, so navigating there after recording a deal could show a copy rendered *before* the car existed. `router.refresh()` now runs after saving a lead and after recording a sale, which drops that cache. `force-dynamic` was already set and was never the problem.
- **A lead could move backwards out of "Deal", stranding its car and its commission.** `record_lead_deal()` guarantees a lead at Deal has an inventory row, but nothing guarded the way back out, so moving the lead to any other status left the car in Inventory holding the money paid for it while no longer being reachable from a lead anyone would look at. The trigger was in `LeadDetail`: an effect meant to fill in the purchase price rebuilt the *whole* draft with `...draftFromLead(lead)` the moment the car finished loading, silently resetting the status field from a possibly-stale copy of the lead — and the next Save wrote that stale value back. Confirmed in production data on lead `c9d5ad7a`, which went `deal → pending` twice within three minutes and left a AED 111,111 Rolls-Royce Ghost orphaned in Inventory. The effect now touches only the two purchase fields, and `PATCH /api/leads/[id]` refuses (409) to move a lead out of Deal while a car exists for it, because that invariant belongs where every client has to pass.
- **Website visitor figures were roughly 3× too high.** "Visitors this week" and the Overview chart counted `page_view` **rows**, so one person reading the landing page and then Privacy and Terms was three visitors, and a refresh was a fourth. Measured against live data: the dashboard reported **147 visitors when 45 real people had visited** — one session alone contributed 30. Both now count distinct `session_id`, the value that actually identifies a person. Two smaller inflations fixed alongside: `PageViewTracker` returned a **fresh** session id on every call when `sessionStorage` was blocked (so privacy-mode visitors counted as a new person per page), and had no guard against React StrictMode's double-invoked effects. New unit-tested `lib/admin/visitor-count.ts`; 9 new tests.
- **Opening a lead no longer marks it Pending.** Rendering the detail page persisted `new → pending` automatically, so a glance — or a mis-click from the list — permanently destroyed the one signal that says nobody has picked this lead up yet. That a lead was opened is now recorded as a view in the Activity timeline, which is where it belongs: history, not a status change.
- **"Pending" was almost exactly the same colour as "Deal".** `--warning` was `#e0b341` against a `--gold` of `#d4af4e` — close enough to read as one colour, so an untouched lead looked like a bought car at a glance, and every genuine warning ("Unsaved changes", a partly-issued quarter) blended into the brand accent. `--warning` is now a real orange, `#f0883c`: separated from gold by hue (~25° vs ~44°) *and* by weight (green channel 136 vs 175), so the two stay distinct in dark mode and under red-green colour blindness.
- **The activity timeline showed mock data and printed raw event names.** `LeadDetail` rendered `mockLeadEvents` rather than the real `lead_events` rows the API had been serving all along; `car_purchased` — the single most important event in the pipeline — had no sentence written for it and rendered as the literal string `car_purchased`; and the route kept its own stale copy of the status labels, which still said "Closed" and had never learned `inspection_scheduled`, `inspected`, `negotiating` or `deal`.

### Added

- **A view record and view summary on each lead.** Opening a lead writes a `lead_viewed` event, deduped to one per 30 minutes so refreshes and tab-switching cannot inflate it. The Activity card shows `Opened 6× · last today at 14:32`, and every timeline entry now carries a date **and** a time — "notes updated" three times in an afternoon is a different story from three times in a month. Views are summarised rather than listed so that opening a lead repeatedly cannot bury the actions taken on it.

### Changed

- **Multi-select filters with checkboxes** on the Leads directory (status, makes, emirates) and Inventory (status), via a new `components/ui/MultiSelect.tsx`. Several options can be active at once; an empty selection means "no filter" rather than "match nothing", so unticking the last box returns the full list instead of stranding the user on an empty table. Within one filter the ticked options are OR'd, across filters AND'd — the only reading where adding a tick can never remove a row that was already visible. Built on real `<input type="checkbox">` elements inside `<label>`s so keyboard interaction, focus order and screen-reader state come from the browser. The single-select dropdowns elsewhere (lead status, the public valuation form) are deliberately unchanged: those are setters and inputs, not filters, and a car cannot be two makes.
- **Performance: five admin screens now render their data on the server instead of fetching it after mount.** Overview, Inventory, Commission, Incomplete Forms and Blocked Numbers were Client Components that mounted empty and then called their own API over HTTP — a request that went back out through middleware before reaching the query. Each is now a thin Server Component (`page.tsx`) that runs the query in-process and hands the result to a client half (`*-client.tsx`) which still owns every interaction. In the build output all five moved from `○` (static) to `ƒ` (server-rendered on demand). The read logic moved to a new `lib/admin/queries.ts` so there is **one** implementation: the route handlers still exist, behave identically, and remain the path for Refresh and every post-write reload. Commission benefits most — building the statements issues one sequential RPC per month, and that whole chain used to start only after a second auth check.
- **Performance: the admin dashboard no longer pays two auth round trips per request.** `middleware.ts` called `supabase.auth.getUser()`, which sends a request to Supabase's auth server every time — measured at **~450ms** per round trip to this project — then ran a second, sequential `profiles` query. Because every admin page is a client component that fetches after hydration, one sidebar click paid that toll twice (navigation + the API call it triggers) for **~2,250ms of sequential network** before anything painted. Now: `getClaims()` verifies the session JWT's ES256 signature locally with WebCrypto against a JWKS cached once per server process, and the `must_change_password` query is gated to page navigations only — on `/api/admin/*` its result was being discarded unread, since an API route cannot be redirected. **~2,250ms → ~900ms (≈60%).** Session refresh is unaffected (`getClaims()` refreshes via `getSession()` internally). Trade-off: a session revoked server-side keeps access until its token expires (default 1 hour). See `DECISIONS.md` ADR-003.
- **Performance: the brand marquee no longer renders the whole logo catalogue.** It sampled ~150 logos and duplicated them for the loop, putting 300 tiles, 303 images and 345 KB of HTML on every public page, each tile its own `<button>`. React had to hydrate 300 interactive elements before the page would respond to a click, and the 72,000px-wide belt carried `will-change: transform` — about ten times what a GPU holds in one texture. Now: 32 logos sampled at an even stride, one button for the whole belt, no `will-change`. HTML 345 KB → 123 KB, images 303 → 67, belt 72,000px → 15,360px. `MARQUEE_LOGO_COUNT` tunes it. (`KNOWN_ISSUES.md` ISSUE-007)
- **Security headers added** (`next.config.mjs`): CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS on every response; `noindex, nofollow` on `/admin/*` and `/api/*`; `X-Powered-By` removed. The CSP still permits `'unsafe-inline'` for scripts — nonce-based CSP is a separate follow-up. (ISSUE-008)
- `GET /api/admin/leads` now caps at 1000 rows and reports `truncated`, instead of fetching the table unbounded. A guard, not real pagination. (ISSUE-003)
- Lead detail's "Estimated Value (AED)" replaced by "Purchase Price (AED)" plus a purchase date, shown only when the status is Deal — the moment money actually changes hands. `requiresEstimatedValue()` became `requiresPurchasePrice()`. The `estimated_value_aed` column and every historical figure in it are untouched; the field is simply no longer shown or collected.
- Replaced the heavier full-page blur intro with an opacity-only page fade; the visual blur effect now belongs to the hero image/text animation only, reducing stacked filter work on first load.
- Merged the former footer video band into `Footer.tsx`, producing one compact footer with the `footer.mp4` wordmark reveal and minimal contact/social/credit content below it, without visible divider lines.
- `SellExperience` now uses the client-provided `public/images/dubaii.jpeg` Defender photo as the How It Works background, with the top gradient tuned to blend into the preceding section.
- Removed the premium loading screen in favor of the lighter page/hero reveal.
- Replaced the Brands marquee with an animated column-based logo carousel (cult-ui "LogoCarousel" pattern): `components/ui/logo-carousel.tsx` cycles car-brand logos per column with framer-motion spring/blur transitions. New `components/public/car-logos.tsx` provides recognizable car-brand SVG logos (Mercedes, BMW, Audi, Porsche, Range Rover, Bentley, Toyota, Nissan, Ferrari, Lamborghini). `BrandBrowse.tsx` now renders the carousel inside a glass panel (kept the existing section header/copy) and became a client component (function-typed logo props can't cross the RSC boundary). Removed the now-unused `popularBrands`/`BrandMark`/`PopularBrand` config. NEW DEPENDENCY: `framer-motion`. Column count is 3 with responsive column widths to avoid horizontal overflow at 320-430px. `GradientHeading` (and its `cva`/`@radix-ui/react-slot` deps) from the reference was intentionally not adopted; the site's `SectionHeader` is used instead.
- Removed the Final CTA section (`FinalCta.tsx` deleted, dropped from the homepage). The luxury car photo it used was preserved for the valuation modal via a renamed `landingImages.modal` key (was `finalCta`), and `ValuationModal.tsx` updated accordingly.
- Fixed the pre-footer CARVIBEDUBAI wordmark not showing: it now reliably fades in gradually (~2.2s) shortly after the video band scrolls into view (plus on video `ended`), and uses a solid white + shadow treatment instead of `mix-blend-overlay` so it is clearly visible.
- Strengthened hero headline contrast (darker left scrim + stronger text shadow) so the white "We Buy Your Car Across the UAE" text is always clearly legible over the Rolls Royce image.
- Removed the "About Us" / "Why Choose Us" carousel section (`WhyChooseUs.tsx` deleted, dropped from the homepage and from the navbar; `#why-us` nav item removed). Also removed the now-orphaned `landingImages.trust` config key.
- Refined the gold palette to a more premium, modern champagne-gold across design tokens (`--gold` #d4af37 -> #d4af4e, plus soft/hi/deep and the `.btn-gold` gradient, `.divider-gold-fade`, `.card-shadow`, and selection color in `globals.css`).
- Rebuilt the "How It Works" section (`SellExperience.tsx`) into a clean, modern, glassmorphism layout: centered header + three frosted-glass step cards with numbered gold chips and hover lift, a glass trust-points/CTA bar, over a darkened premium car backdrop. Also fixed its broken background image (`landingImages.process` pointed at the non-existent `carvibe-real-defender-studio.jpeg`, now uses `carvibe-real-range-rover.jpeg`), which had been rendering as an empty black gap.
- CARVIBEDUBAI video band (`FooterVideoBand.tsx`): the big wordmark now stays hidden while the mp4 plays and gradually fades/reveals in (~2.6s) once the video finishes/pauses (via `ended`/near-end `timeupdate`), instead of being always visible.
- Added a premium landing-page loading screen (`components/public/LoadingScreen.tsx`, mounted in the public layout): full-screen dark overlay with the brand logo, an animated gold indeterminate bar, and a self-dismissing fade (`loader-out`/`loader-bar`/`loader-reveal` keyframes) that also unmounts via JS and locks scroll briefly.
- Hero background replaced with a generated realistic cinematic Rolls Royce image (`public/images/hero-rolls-royce.png`): black Rolls Royce Ghost on the right (fully visible, uncovered), dark negative space on the left for the headline, Dubai night skyline. Hero overlay gradients lightened (car no longer dimmed by the text scrim) and the bottom fades fully to `#0a0a0a`; the following "Why Sell" section's top hairline divider was removed so the hero blends seamlessly into it. (Supersedes the earlier `heroo.svg` background, which was ~8 MB and rendered too dark/covered.)
- Hero background image now points at `public/images/heroo.svg` (via `landingImages.hero` in `config/homepage.ts`) instead of `hero.jpeg`. Note: the SVG asset is large (~8 MB) and embeds raster data, so it is heavier than the previous JPEG - flagged as a performance follow-up if it affects load times.
- Removed the "English"/globe language label from `UtilityBar.tsx` (no i18n exists); the left side now shows the brand tagline. Navbar tabs gained an active-section scroll-spy highlight (`IntersectionObserver`) with a gold underline/active state, and the generic post-hero sections were made more premium: `SellerAssurance` and `FlexibleInspection` redesigned into bordered gradient cards with icon chips, index numbers, hover lift/glow and a new shared `Reveal` scroll-animation component (`components/public/Reveal.tsx`); `SellExperience` step numbers became circular gold chips; `Contact` detail rows became bordered cards; `FlexibleInspection` gained an all-7-Emirates coverage strip.
- "Why Choose Us" resized to be more compact: explicit `min-h-[540px]/[580px]` instead of the spacious `py-section` token, smaller statement/tagline text, and tighter spacing throughout, since the section was taking up more than a full screen's height.
- "Why Choose Us" upgraded to a full-bleed photo carousel: real background image with a Hero-style gradient, glass-style arrow buttons, a "01 / 04" slide counter, and a segmented auto-advance progress bar (new `progress-fill` animation) replacing the earlier flat-black version.
- Navbar gained "How It Works" (`#sell-your-car`) and "Brands" (`#brands`) links - both real sections that previously had no nav entry.
- "Why Choose Us" rebuilt as a 4-slide auto-advancing trust-statement carousel (gold-highlighted key phrases, tagline, valuation CTA, arrow + dot navigation, new `slide-in` animation), replacing the previous image/stats/trust-points layout; styled after a client-supplied reference component. Removed the now-unused `trustPoints`/`businessStats`/`TrustPoint` config and `landingImages.trust`.
- Footer columns now fade/blur into view with a staggered scroll-triggered reveal (vanilla `IntersectionObserver` + CSS transitions, no new dependency) and gained a subtle gold-tinted top glow, styled after a client-supplied reference component while keeping the footer's real content and its seamless blend with the video section above it.
- Removed the "Rent" navbar item entirely; "Buy" alone now triggers the "Coming Soon" modal (reverted to Buy-only copy). `Hero.tsx` subcopy no longer mentions renting.
- Normalized section background colors: `Hero.tsx`, `BrandBrowse.tsx`, and `WhyChooseUs.tsx` used ad-hoc hex shades (`bg-[#070808]`/`bg-[#080807]`) that drifted from the site's two-tone canvas system - all three now use `bg-bg` so sections blend seamlessly with no visible seams.
- Footer refactored to align with the new video section: removed the background photo and giant watermark text, added a 12-column grid with semantic contact facts (Showroom Area / Direct Line / Hours) and bordered social icon buttons, with a single divider-gold-fade seam matching the site's sanctioned pattern.
- Navbar "Rent" now opens the same "Coming Soon" modal as "Buy" (previously pointed at the now-removed `#financing` anchor); modal copy generalized to cover both.
- Brand Browse section: removed the left backdrop photo/text column so the logo marquee spans full width; rewrote the copy to "Here are the brands we buy - and many more." with a short reassurance that unlisted brands are still welcome; each logo card now grows (`hover:scale-[1.15]`) with a gold glow on hover.
- Hero tagline "Fast, Fair & Hassle-Free." now has its own smaller, `whitespace-nowrap` sizing so it can no longer wrap into a broken shape; removed the "Introducing / CarVibeDubai / Car Buying & Valuation Specialists" identity block; headline changed from "We Buy Your Car in Dubai" to "We Buy Your Car Across the UAE" (footer tagline updated the same way); assurance line's "no instant price shown" replaced with "Fair, transparent negotiation".
- Navbar "Buy" item (desktop and mobile) now opens a "Coming Soon" modal with a blurred backdrop instead of anchor-scrolling to a section.
- Hero background image now uses the client-provided `public/images/hero.jpeg` instead of the Lamborghini photo; the search-bar CTA was replaced with an outlined uppercase-tracked button (still opens the valuation modal).
- `Navbar` shifted from `top-0` to `top-8` to sit below the new utility bar; `app/privacy/page.tsx` and `app/terms/page.tsx` top padding increased to clear the taller fixed header stack.
- Reverted the hero from the two-button "buying-desk" layout back to the single search-bar-style `Get Free Valuation` CTA after client feedback preferred the earlier look. Kept the Dubai Lamborghini hero image, enlarged the headline (`clamp(2.15rem,...,3.65rem)`), reduced the forced hero height (`min-h-[85svh]` instead of a full-screen `100svh`/`88svh`), rewrote the headline/subcopy to lead with the active "we buy your car" service (buying/renting noted as launching soon), and hardened the search-bar CTA against overflow on 320px-wide screens (responsive padding, `shrink-0`, `truncate`).
- Redesigned the hero into a buying-desk lead funnel: Dubai Lamborghini skyline photo as the hero image, larger clamp-based headline ("We buy your car in Dubai. Fast. Fair. Hassle-free."), natural lead-focused paragraph, gold `Get My Free Valuation` button (existing valuation modal) plus glass `Chat on WhatsApp` secondary CTA replacing the search-bar-style CTA, a three-point trust row, a small "Buy & rent marketplace — coming soon" note, and hero height reduced from 100svh to 88svh.
- Renamed the navbar desktop/mobile actions from `Book Now`/`Log in` to `Call Now`/`Message Us` (both open the valuation modal) and moved the `Coming soon` badge from `Sell` to `Buy` so navigation matches the active sell-to-us funnel.
- Refactored the public first viewport to closely match the supplied premium automotive reference: fixed glass header, left logo, centered pill navigation, `Sell` with a small `Coming soon` label, right-side `Book Now`/`Log in` actions, and a hero search-bar-style `Get Free Valuation` CTA. The valuation form and modal flow were intentionally left unchanged.
- Reworked the public landing page from hero through footer into full-width black/gold real-photo bands using the selected images from `public/images/`, while preserving the hero content positioning and existing valuation modal behavior.
- Refactored the public landing page toward a more premium private-valuation experience: lighter typography, stronger hero copy, a refined logo/header treatment, tightened hero buying-desk rail, asymmetrical vehicle profile lookbook, reordered section flow, flatter brand/body-type walls, concierge-style contact section, calmer final CTA/footer styling, and removal of wide/negative tracking from public landing and valuation-modal labels.
- Updated the public Brand Browse badges from single-color line art to lightweight brand-colored SVG treatments for Mercedes-Benz, Range Rover, Porsche, Bentley, BMW, Audi, Toyota, Nissan, Ferrari, and Lamborghini.
- Refactored the entire public landing page to an "editorial minimal" black-and-gold design: one flat canvas background, a strict gold usage budget (eyebrows, primary CTA, stats/step numbers, hover, two bookend dividers only), hairline dividers replacing gold card borders, and borderless numbered/divided lists replacing boxed cards across Vehicle Discovery, Brand Browse, Featured Vehicles, Body Types, Sell Experience, Why Choose Us, Financing, Reviews, Final CTA, and Contact. Hero kept its layout and copy with only styling polish (de-boxed stats, de-pilled assurance chips, standardized eyebrow). Added shared `Section`/`SectionHeader` components and a `buttonClasses()` helper to remove duplicated section-header and CTA markup. Removed unused `HowItWorks.tsx` and `CarSkylineArt.tsx`.
- Refined the post-hero homepage around Milestone 1 sell-side valuation: the vehicle finder became an evaluation showcase, brand browse became accepted-brand badges, vehicle cards became valuation profiles, and body-type cards became passive guidance.
- Updated the public header to a darker glass-style navigation treatment with a valuation-first main action.
- Reduced repeated WhatsApp CTAs across the navbar, vehicle profile cards, financing preview, final CTA, and footer.
- Replaced the basic post-hero homepage flow with a premium black-and-gold automotive marketplace presentation while keeping buy-car, inventory, financing, and reviews as UI/request-based previews until approved.
- Modernized the public landing first impression with a two-tier dealership-style header, lighter main nav, cleaner logo treatment, updated font pairing, and less template-like hero typography.
- Aligned Milestone 1 public landing UI with Sir Nyash's form answers: free valuation messaging, WhatsApp-right header action, Buy a Car Coming Soon, approved How It Works wording, contact-first valuation form, inspection emirate field, and updated public contact/social details.
- Redesigned public How It Works, Contact, and Footer sections to better match the premium black/gold showroom direction.
- Reworked How It Works and Contact again with unique non-photo layouts so they no longer repeat the hero showroom image.

### Removed

- 3.4 MB of image files that no code referenced: `hero-rolls-royce.png`, `heroo.svg`, `logo.svg`, `scraps.png`. `public/images/` is now 8 MB, down from 12 MB. Only historical mentions in `CHANGELOG`/`WORK_LOG` referred to them; all four remain recoverable from git history.
- Financing preview section (`FinancingSection.tsx`) and the reviews block of `ReviewsAndFinalCta.tsx` (the "pending real reviews" placeholder), both flagged by the client as unnecessary; the real closing CTA was preserved as `FinalCta.tsx`. Removed the now-orphaned `financingHighlights`/`customerReviews` config and `financing`/`reviews` `landingImages` keys.
- Vehicle Discovery ("What CarVibeDubai Evaluates") and Featured Vehicles ("Vehicle Profiles") sections, and their `evaluationProfiles`/`featuredVehicles` config, for being unnecessary/redundant; replaced by the new Seller Assurance section.
- Body Type Browse section (`components/public/BodyTypeBrowse.tsx`) and its `bodyTypes`/`BodyType` config, replaced by the new Flexible Inspection section.

### Fixed

- Removed the floating WhatsApp button from the public layout to avoid narrow-screen content overlap and reduce repeated contact actions.
- Public valuation form now accepts common UAE WhatsApp/mobile formats such as `0564145781`, `971564145781`, and `+971564145781` instead of requiring only the exact `+971...` format.

### Security

- Phone validation remains UAE-mobile-only on the client side; final backend storage must normalize and revalidate before OTP or lead storage.

## Entry template

### YYYY-MM-DD — Title

**Type:** feature | fix | refactor | security | performance | docs | database

**Summary:**  
**Code files:**  
**Documentation updated:**  
**Verification:**  
**Remaining work:**
## 2026-09-06

- **Admin demo leads:** added Leads-only controls that create 40 server-backed
  demonstration leads (five per status) and a one-time cleanup action. Demo rows
  are marked with `source = demonstration` and a `DEMO-ONLY` note; cleanup does
  not touch non-demo leads, and both controls disappear permanently after a
  successful delete. Added migration `0020_demo_lead_runs.sql` for the
  server-side one-time state.

## 2026-09-10 Overview comparison clarity

- Dashboard comparison charts now explain the exact date pair on hover (for
  example, selected 08 Sept versus earlier 01 Sept) and group values into
  clear Selected and Earlier sections. Chart legends use the actual earlier
  date range, and the duplicate unlabeled profit legend entry was removed.

## 2026-09-13 Arrival, specification, and inspection report workflow

- Added an admin-managed Specification catalog, required public valuation
  selection, and server validation through incomplete-form conversion.
- Added separate arrival tracking for scheduled, Purchaser-assigned leads.
- Added Purchaser inspection drafts, private 22-photo uploads, report PDF
  download, and atomic lead/report/audit completion through migration 0027.
- Fixed a lead-route ordering bug that prevented the CSR Arrival toggle from
  persisting its status and Activity entry.
- Verified the inspection PDF route embeds all required stored photos in the
  downloadable attachment instead of returning image links.
- Redesigned completed inspection PDFs around the supplied eight-page reference:
  print-safe information/check grids, actual inspector/completion details,
  aspect-ratio-preserving labeled photo layouts, full failure notes, and the
  filename `Inspection Report For - Make Model Year.pdf`. Removed the contact,
  website, CVD box, and divider header so the report title begins at the top.
- Added a role- and completion-gated **View inspection form** link on customer
  records for Purchasers and owner-level staff; direct inspection reads apply
  the same server-side boundary.

## 2026-09-10 Incomplete-form recovery handoff

- Incomplete forms now go to Call Centre first, not Purchasers. A CSR must
  complete and confirm details before converting a capture into a real Lead.
- **Convert to Lead & Schedule Inspection** creates the real lead, records the
  booking, retains the CSR owner, and server-assigns an active Purchaser.
- Detail/list/API access now prevents Purchasers from seeing unverified
  incomplete forms. Assignment is recorded in the partial activity timeline.
- Added migration `0026_partial_lead_csr_handoff.sql` for status compatibility,
  automatic CSR assignment, and service-role-only function access.
- CSR conversion now uses dependent Make, Model, optional Trim, and Emirate
  dropdowns fed by the live Vehicle Catalog. The server rejects an invalid
  Make/Model combination even if a request is manually crafted.

## 2026-09-10 Demo script

## 2026-09-14 - Manual lead entry

- Authorized staff can create leads for direct walk-ins, calls, WhatsApp
  messages, and other documented intake channels from the Leads Directory.
- Added automatic creator audit attribution, duplicate-phone warning, Call
  Centre routing, and lead-source display/export.
- Referral incentive and payout behavior was not added.

## 2026-09-14 - Verified employee referral incentive

- Manual leads can now record one proof-backed employee or client referral.
- Added a configurable Super Admin referral amount that is frozen when a
  referred vehicle is sold, then shown in the employee's existing commission
  invoice and paid with their other outstanding commission.

- Added a simplified Incomplete Forms explanation and an easy-to-present CSR
  confirmation and Purchaser handoff scenario to the admin demo PDF.
- **Super Admin lead reassignment.** Added secure owner dropdowns and required reason capture on lead details. Reassignments are recorded in Activity and do not change future round-robin order.
- **Call Centre Agent Manual.** Added a simple operations manual covering only the current agent workflow, allowed statuses, incomplete-form conversion, inspection handoff, notes, Activity, permissions, and daily checklist.
- **Purchaser Manual.** Added a plain-language manual based on the existing Purchaser workflow: inspection handoff, assigned leads, allowed statuses, Deal requirements, Inventory, notes/activity, commission, limitations, and daily checklist.
- **Inventory role commission view.** Added an owner-only checkbox dropdown for Call Centre, Purchaser, and Developer commission columns, with all roles selected by default and amounts calculated from the existing inventory profit and assignment data.

## 2026-09-24 - Scrap inquiry workflow

- Added a dedicated public Scrap inquiry mode and permanent Scrap origin across
  Leads and Inventory.
- Scrap cars retain their classification, use the existing operational flow,
  and require Super Admin/Owner approval before becoming a Deal.
- **Super Admin lead reassignment.** Added secure owner dropdowns and required reason capture on lead details. Reassignments are recorded in Activity and do not change future round-robin order.
- **Call Centre Agent Manual.** Added a simple operations manual covering only the current agent workflow, allowed statuses, incomplete-form conversion, inspection handoff, notes, Activity, permissions, and daily checklist.
- **Purchaser Manual.** Added a plain-language manual based on the existing Purchaser workflow: inspection handoff, assigned leads, allowed statuses, Deal requirements, Inventory, notes/activity, commission, limitations, and daily checklist.
- **Inventory role commission view.** Added an owner-only checkbox dropdown for Call Centre, Purchaser, and Developer commission columns, with all roles selected by default and amounts calculated from the existing inventory profit and assignment data.
# Unreleased

- Added automatic abandoned-form retention: unconverted incomplete valuation and Scrap records archive after 30 inactive days and permanently delete after 90 days in bounded daily batches. Returning activity restores an archived form; confirmed leads and operational/financial records are excluded.
- Updated locked Axios and Nodemailer patch versions to resolve the dependency audit findings without changing their application APIs.

- Simplified the Super Admin Developer Share payment flow: all currently
  unpaid monthly developer-share records can be paid immediately through one
  clearly labelled action. Quarterly payment is now guidance, not a system
  restriction, and the monthly breakdown is optional.

- Fixed referral recipients so Purchasers and Call Centre employees who receive
  a referral incentive appear in the Referral recipients view.
- Prevented zero-value referral incentives from appearing as payable entries or
  invoice line items, and kept combined staff rows from being duplicated when
  multiple commission filters are selected.
