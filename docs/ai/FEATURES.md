# FEATURES.md

## Status values

- idea
- planned
- ui-only
- mock-integrated
- backend-ready
- supabase-integrated
- tested
- client-approved
- blocked

## Feature registry

| Feature | Purpose | Roles | Status | Main files | Data needed | Notes |
|---|---|---|---|---|---|---|
| Vehicle management | Manage vehicle records | Admin, Agent | planned | TBD | vehicles | Confirm required fields |
| Availability | Track usable or bookable vehicles | Admin, Agent | planned | TBD | vehicles, bookings | Confirm conflict rules |
| Booking management | Create and monitor bookings | Admin, Agent | planned | TBD | bookings | Confirm statuses |
| Client management | Manage client records | Admin, Agent | planned | TBD | clients | Minimize personal data |
| Payments | Record payment status | Admin | planned | TBD | payments | Confirm scope |
| Dashboard | Show important summaries | Admin, Agent | planned | TBD | multiple | Confirm metrics |
| Public landing page | Present Sir Nyash-approved free valuation funnel and contact paths | Visitor | ui-only | `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `components/public/UtilityBar.tsx`, `components/public/Navbar.tsx`, `components/public/PageIntro.tsx`, `components/public/Hero.tsx`, `components/public/SellerAssurance.tsx`, `components/public/SellExperience.tsx`, `components/public/BrandBrowse.tsx`, `components/public/FlexibleInspection.tsx`, `components/public/Contact.tsx`, `components/public/Footer.tsx`, `components/public/ValuationModal.tsx`, `components/public/valuation-form/*`, `components/ui/logo-carousel.tsx`, `components/public/car-logos.tsx`, `config/brand.ts`, `config/copy.ts`, `config/homepage.ts`, `public/images/dubaii.jpeg`, `public/images/hero-rolls-royce-v2.png`, `public/videos/footer.mp4` | customer name, WhatsApp number, year, make, model, mileage, condition, inspection emirate, brand contact details, final make/model list, final Gmail, final logo file | Milestone 1 public website is a premium black/gold sell-side valuation landing page. `UtilityBar` shows phone/social access without the removed language label. `Navbar` has active scroll-spy links for Sell, How It Works, Brands, and Contact; `Buy` opens a Coming Soon modal. `Hero` keeps the approved Rolls Royce visual, headline, valuation CTA, and a focused blur-to-sharp intro animation. The full-page intro is now a lightweight opacity fade only, so it does not stack expensive blur filters over the hero animation. `SellerAssurance`, `SellExperience`, `BrandBrowse`, `FlexibleInspection`, and `Contact` form the current homepage flow; removed sections include About/WhyChooseUs, Final CTA, Financing, Reviews, Vehicle Discovery, Featured Vehicles, and Body Type Browse. `SellExperience` uses the client-provided `dubaii.jpeg` Defender photo with dark gradients that blend into adjacent sections. `BrandBrowse` uses the framer-motion logo carousel with responsive columns. `Footer` now combines the former video band and footer into one compact, line-free footer: `footer.mp4` plays only while in view, the `CarVibeDubai` wordmark re-reveals on scroll, and footer contact/social/credit content sits directly below it. The valuation form/modal remains UI-only; lead persistence, OTP, Supabase, Gmail notifications, and CRM/admin flows are still planned for later milestones. WhatsApp validation accepts common UAE mobile formats such as `0564145781`, `971564145781`, and `+971564145781`. |

Replace examples with actual implemented features.

## Feature template

### Feature name

**Purpose:**  
**Users:**  
**Status:**  
**Main files:**  
**Rules:**  
**Validation:**  
**Permissions:**  
**Data:**  
**Mobile behavior:**  
**Security impact:**  
**Acceptance criteria:**  
**Next step:**
