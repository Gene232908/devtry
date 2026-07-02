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
| Public landing page | Present Sir Nyash-approved free valuation funnel and contact paths | Visitor | ui-only | `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `components/public/Navbar.tsx`, `components/public/Hero.tsx`, `components/public/VehicleDiscovery.tsx`, `components/public/BrandBrowse.tsx`, `components/public/FeaturedVehicles.tsx`, `components/public/BodyTypeBrowse.tsx`, `components/public/SellExperience.tsx`, `components/public/WhyChooseUs.tsx`, `components/public/FinancingSection.tsx`, `components/public/ReviewsAndFinalCta.tsx`, `components/public/Contact.tsx`, `components/public/Footer.tsx`, `components/public/ValuationModal.tsx`, `components/public/valuation-form/*`, `config/brand.ts`, `config/copy.ts`, `config/homepage.ts`, `config/vehicles.ts`, `public/images/carvibe-*.jpg` | customer name, WhatsApp number, year, make, model, mileage, condition, inspection emirate, brand contact details, accepted brand/body-type references, future financing/content rules | Milestone 1 UI aligned to Sir Nyash answers while presenting a premium sell-side valuation homepage. Hero and valuation funnel remain primary; post-hero sections now focus on vehicles CarVibeDubai evaluates, accepted brand badges, valuation profile cards, body-type guidance, and process/trust content. Redundant WhatsApp/search/listing actions were removed, including the floating WhatsApp button. Header uses a dark glass two-tier layout with top phone/social strip and main valuation action. Buy-car, inventory, financing, and reviews remain UI-only previews until real database and approvals exist. WhatsApp validation accepts common UAE mobile formats such as `0564145781`, `971564145781`, and `+971564145781`. Supabase integration not started; exact Gmail, final logo, real inventory, financing rules, and final make/model list still needed. |

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
