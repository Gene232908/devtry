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
| Executive Overview | Owner-only business health dashboard: revenue, gross profit, pipeline, inventory aging, staff contribution, urgent action alerts, and historical custom comparison | Admin, Manager | supabase-integrated | `app/(admin)/admin/page.tsx`, `components/admin/ExecutiveDashboard.tsx`, `components/admin/ExecutivePanels.tsx`, `lib/admin/executive-overview.ts`, `app/api/admin/overview/route.ts` | existing leads, events, inventory, profiles, commission tables | Needs Attention is the cross-business urgent-action list; Lead Pipeline is a distinct current-stage snapshot for leads created in the selected period. Pipeline rows deep-link to the Leads Directory with the matching status visibly selected and the same UAE date range applied. Comparison requires an equal-length historical range and clears when the primary range changes, preventing misleading unequal-period metrics. Hover cards name both paired dates and group selected versus earlier values in plain language. Uses existing timestamped records and existing sale-profit formula; source attribution and Overview audit activity are intentionally excluded. Demo records remain included until the production reporting cleanup is approved. |
| Commission management | Review and settle Agent, Purchaser, and Developer commission | Super Admin; self-view for Agent/Purchaser | supabase-integrated | `app/(admin)/admin/commission/commission-client.tsx`, `components/admin/CommissionScopeFilter.tsx`, `lib/admin/queries.ts` | existing commission entries, statements, profiles | Super Admin starts with All categories selected and can combine checkbox filters. The mixed staff table labels each row with its Agent 2% or Purchaser 10% rate; Developer statements remain a separate quarterly section. Server routes remain responsible for access and settlement authorization. |
| New-lead email notification | Email the owner-managed Settings recipient after a verified valuation lead is stored | Public submitter triggers; Super Admin configures recipient | backend-ready | `app/api/leads/route.ts`, `lib/server/lead-notifications.ts`, `app/api/admin/settings/test-notification/route.ts`, Settings | existing `settings.notify_email`; server-only SMTP credentials | The lead is stored before email delivery is attempted. The next lead always reads the current saved Notify email. Settings offers an owner-only test email; delivery failure does not reject a customer submission. |
| Lead follow-up history | Keep the latest editable follow-up note while preserving a dated staff audit trail | Super Admin, assigned Call Centre, assigned Purchaser | backend-ready | `components/admin/LeadDetail.tsx`, `components/admin/LeadActivityCard.tsx`, `app/api/leads/[id]/route.ts`, `app/api/admin/leads/[id]/events/route.ts` | existing `leads.notes`, `lead_events`, profiles | The note field is the latest working note. Each note/status save records the authenticated staff name and role in Activity. The card shows the five newest events; full history opens in a contained scrollable dialog. |
| Arrival and purchaser inspection report | Call Centre confirms arrival; the assigned Purchaser starts, saves and may later correct a structured inspection with 24 documented private photos | Assigned Call Centre arrival; assigned Purchaser and Super Admin inspection access | backend-ready pending migrations 0027-0028 | `components/admin/LeadDetail.tsx`, `components/admin/InspectionWorkspace.tsx`, `app/api/admin/leads/[id]/inspection/*`, migrations 0027-0028 | `leads.arrival_*`, `inspection_reports`, `inspection_photos`, private storage | Save Inspection marks the lead Inspected. Card/photo changes are audited. Photos expire 60 days after sale; report data remains. |
| Catalog specifications | Allow Super Admin to manage the required Specification dropdown used in valuation and inspection workflows | Super Admin writes; public valuation and Purchaser inspection read | backend-ready pending migration | `components/admin/CatalogSpecificationsCard.tsx`, `app/api/admin/catalog/specifications/*`, `app/api/vehicles/route.ts` | `vehicle_specifications`, `leads.specification`, `partial_leads.specification` | Browser options are managed by Super Admin; the server rejects invented values and recovery retains the selected value. |
| Incomplete-form recovery | Recover unfinished valuation forms without treating them as confirmed leads | Admin, Manager, Call Centre | backend-ready | `app/api/partial-lead/route.ts`, `app/api/admin/partial-leads/[id]/route.ts`, `components/admin/PartialLeadDetail.tsx` | `partial_leads`, `partial_lead_events`, `leads`, profiles, vehicle catalog | New captures are assigned to Call Centre. The CSR must complete and confirm required details before scheduling an inspection. Make, Model, and optional Trim use the live Vehicle Catalog in dependent dropdowns; server validation rejects made-up make/model pairs. Scheduling converts the capture to a real lead and assigns a Purchaser; Purchasers cannot view incomplete forms. Requires migration `0026_partial_lead_csr_handoff.sql`. |
| Inventory role commission view | Show Super Admin the Call Centre, Purchaser, and Developer commission columns with an All roles checkbox filter; role amounts use the existing positive-profit rates and lead assignments | Super Admin; existing inventory visibility for staff roles | supabase-integrated | `app/(admin)/admin/inventory/inventory-client.tsx`, `lib/admin/inventory.ts`, `lib/admin/queries.ts` | existing inventory commission entries and lead assignments | All roles are selected by default. Unchecking a role hides only that role's commission column; it does not remove inventory rows or change stored profit. |
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
