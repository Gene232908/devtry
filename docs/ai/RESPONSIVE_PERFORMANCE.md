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
- Prevent page-level horizontal scrolling.
- Use responsive padding, gaps, and max-width containers.
- Use fluid font sizes or `clamp()` where useful.
- Keep important touch targets around 44×44 CSS pixels.
- Make forms stack logically on mobile.
- Give tables a safe mobile strategy.
- Make dialogs fit and scroll inside the viewport.
- Do not rely on hover-only behavior.

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

## Design system changelog

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
