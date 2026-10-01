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

The owner Business Overview includes a compact Scrap Sales summary for the selected UAE date range: cars sold, sold value, expenses, and confirmed net profit. Scrap workflow stages and activity are reviewed in Scrap Inquiries. Sales remain attributable to Scrap even when the original inquiry was created before the selected reporting period.

| Feature | Purpose | Roles | Status | Main files | Data needed | Notes |
|---|---|---|---|---|---|---|
| Temporary public OTP pause | Accept Free Valuation and Scrap Inquiry without paid WhatsApp verification while preserving a reversible OTP path | Public submitter; staff review unverified numbers | tested locally; staging/mobile and deployment pending | `app/api/leads/route.ts`, `app/api/otp/{send,verify}/route.ts`, `components/public/valuation-form/*`, `lib/server/public-lead-verification.ts` | existing `leads.id` UUID and `phone_verified`; no migration | Server mode defaults to `unverified`; every successful public submission is persisted with `phone_verified=false`. OTP endpoints refuse new requests while paused. See `docs/ai/OTP_TEMPORARY_BYPASS/README.md` for release and restoration gates. |
| Executive Overview | Owner-only business health dashboard: revenue, gross profit, pipeline, inventory aging, staff contribution, urgent action alerts, and historical custom comparison | Admin, Manager | supabase-integrated | `app/(admin)/admin/page.tsx`, `components/admin/ExecutiveDashboard.tsx`, `components/admin/ExecutivePanels.tsx`, `lib/admin/executive-overview.ts`, `app/api/admin/overview/route.ts` | existing leads, events, inventory, profiles, commission tables | Needs Attention is the cross-business urgent-action list; Lead Pipeline is a distinct current-stage snapshot for leads created in the selected period. Pipeline rows deep-link to the Leads Directory with the matching status visibly selected and the same UAE date range applied. Comparison requires an equal-length historical range and clears when the primary range changes, preventing misleading unequal-period metrics. Hover cards name both paired dates and group selected versus earlier values in plain language. Uses existing timestamped records and existing sale-profit formula; source attribution and Overview audit activity are intentionally excluded. Demo records remain included until the production reporting cleanup is approved. |
| Commission management | Review and settle Agent, Purchaser, and Developer commission | Super Admin; self-view for Agent/Purchaser | supabase-integrated pending migration 0039 | `app/(admin)/admin/commission/commission-client.tsx`, `components/admin/StaffPaymentHistory.tsx`, `lib/admin/queries.ts` | commission entries, staff payout records, statements, profiles | Each Staff **Mark as Paid** action creates an immutable payout record with amount, included sales, UAE date/time, and confirming Super Admin. Purchasers can see Sold for, Expenses, Net profit, and Margin for their own server-scoped commission entries; Call Centre self-view keeps business profit redacted. The Staff Details dialog retains the full payment history; Super Admin also sees six recent payouts on the main Commission page. Legacy paid entries retain their amount/time but correctly state that the confirmer was not recorded before this feature. |
| New-lead email notification | Email the owner-managed Settings recipient after a public lead is stored | Public submitter triggers; Super Admin configures recipient | backend-ready | `app/api/leads/route.ts`, `lib/server/lead-notifications.ts`, `app/api/admin/settings/test-notification/route.ts`, Settings | existing `settings.notify_email`; server-only SMTP credentials | The lead is stored before email delivery is attempted. The next lead always reads the current saved Notify email. Settings offers an owner-only test email; delivery failure does not reject a customer submission. During the OTP pause, the number is not verified. |
| Lead follow-up history | Keep the latest editable follow-up note while preserving a dated staff audit trail | Super Admin, assigned Call Centre, assigned Purchaser | backend-ready | `components/admin/LeadDetail.tsx`, `components/admin/LeadActivityCard.tsx`, `app/api/leads/[id]/route.ts`, `app/api/admin/leads/[id]/events/route.ts` | existing `leads.notes`, `lead_events`, profiles | The note field is the latest working note. Each note/status save records the authenticated staff name and role in Activity. The card shows the five newest events; full history opens in a contained scrollable dialog. |
| Arrival and purchaser inspection report | Call Centre confirms arrival; the assigned Purchaser starts, saves and may later correct a structured inspection with 24 documented private photos | Assigned Call Centre arrival; assigned Purchaser and Super Admin inspection access | backend-ready pending migrations 0027-0028 | `components/admin/LeadDetail.tsx`, `components/admin/InspectionWorkspace.tsx`, `app/api/admin/leads/[id]/inspection/*`, migrations 0027-0028 | `leads.arrival_*`, `inspection_reports`, `inspection_photos`, private storage | Save Inspection marks the lead Inspected. Card/photo changes are audited. Photos expire 60 days after sale; report data remains. |
| Catalog specifications | Allow Super Admin to manage the required Specification dropdown used in valuation and inspection workflows | Super Admin writes; public valuation and Purchaser inspection read | backend-ready pending migration | `components/admin/CatalogSpecificationsCard.tsx`, `app/api/admin/catalog/specifications/*`, `app/api/vehicles/route.ts` | `vehicle_specifications`, `leads.specification`, `partial_leads.specification` | Browser options are managed by Super Admin; the server rejects invented values and recovery retains the selected value. |
| Vehicle catalog editor | Manage live Make, Model, and Trim choices without reloading the entire growing catalog after each insert | Super Admin writes; public valuation reads | tested pending migration 0029 | `app/(admin)/admin/catalog/page.tsx`, `components/admin/CatalogPagination.tsx`, `app/api/admin/catalog/{makes,models,trims,activity}/*` | `car_makes`, `car_models`, `car_trims`, `catalog_activity` | Successful inserts update local state; duplicate values show contextual toasts and live hints; the server/database enforce case-insensitive active duplicates; archive/restore preserves historical records; ten recent owner changes are shown; selected makes show 15 models per page. |
| Incomplete-form recovery | Recover unfinished valuation and Scrap forms without treating them as confirmed leads | Admin, Manager, Call Centre | tested locally; retention migration/deployed cron pending | `app/api/partial-lead/route.ts`, `app/api/admin/partial-leads/[id]/route.ts`, `app/api/cron/incomplete-form-retention/route.ts`, `components/admin/PartialLeadDetail.tsx` | `partial_leads`, `partial_lead_events`, `leads`, profiles, vehicle catalog | Valid name/phone progress is captured on input, consent, Next, modal exit, and browser/page exit; exit delivery uses a beacon with keepalive fallback. New captures are assigned to Call Centre. The CSR must complete and confirm required details before scheduling an inspection. Vehicle Specification remains hidden during New/Contacted follow-up and appears with the required conversion fields only after selecting Inspection Scheduled. Scrap captures stay Scrap when converted; Make, Model, and optional Trim use the live Vehicle Catalog in dependent dropdowns; server validation rejects made-up make/model pairs. Scheduling converts the capture to a real lead, assigns a Purchaser, and refreshes the authorized Leads store before opening it. Customer Service sees all assigned statuses by default so converted Inspection Scheduled records remain visible in the correct Regular or Scrap directory; Purchasers cannot view incomplete forms. Unconverted records archive after 30 inactive days and delete after 90; returning activity restores an archived row. Requires migrations `0026`, `0035`, and `0040_partial_lead_retention.sql`. |
| Inventory role commission view | Show Super Admin the Call Centre, Purchaser, and Developer commission columns with an All roles checkbox filter; role amounts use the existing positive-profit rates and lead assignments | Super Admin; existing inventory visibility for staff roles | supabase-integrated | `app/(admin)/admin/inventory/inventory-client.tsx`, `lib/admin/inventory.ts`, `lib/admin/queries.ts` | existing inventory commission entries and lead assignments | All roles are selected by default. Unchecking a role hides only that role's commission column; it does not remove inventory rows or change stored profit. |
| Leads and Inventory export | Let staff choose PDF or Excel-compatible export with human-readable fields only; dates use `dd/mm/yyyy` and internal Supabase IDs are excluded | Authorized Leads and Inventory users | supabase-integrated | `components/admin/ExportMenu.tsx`, `lib/admin/export-reports.ts` | currently filtered rows | Export uses the active filtered rows and does not include database IDs. |
| Vehicle management | Manage vehicle records | Admin, Agent | planned | TBD | vehicles | Confirm required fields |
| Availability | Track usable or bookable vehicles | Admin, Agent | planned | TBD | vehicles, bookings | Confirm conflict rules |
| Booking management | Create and monitor bookings | Admin, Agent | planned | TBD | bookings | Confirm statuses |
| Client management | Manage client records | Admin, Agent | planned | TBD | clients | Minimize personal data |
| Payments | Record payment status | Admin | planned | TBD | payments | Confirm scope |
| Dashboard | Show important summaries | Admin, Agent | planned | TBD | multiple | Confirm metrics |
| Public landing page | Present Sir Nyash-approved free valuation funnel and contact paths | Visitor | ui-only | `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `components/public/UtilityBar.tsx`, `components/public/Navbar.tsx`, `components/public/PageIntro.tsx`, `components/public/Hero.tsx`, `components/public/SellerAssurance.tsx`, `components/public/SellExperience.tsx`, `components/public/BrandBrowse.tsx`, `components/public/FlexibleInspection.tsx`, `components/public/Contact.tsx`, `components/public/Footer.tsx`, `components/public/ValuationModal.tsx`, `components/public/valuation-form/*`, `components/ui/logo-carousel.tsx`, `components/public/car-logos.tsx`, `config/brand.ts`, `config/copy.ts`, `config/homepage.ts`, `public/images/dubaii.jpeg`, `public/images/hero-rolls-royce-v2.png`, `public/videos/footer.mp4` | customer name, WhatsApp number, year, make, model, mileage, condition, inspection emirate, brand contact details, final make/model list, final Gmail, final logo file | Milestone 1 public website is a premium black/gold sell-side valuation landing page. `UtilityBar` shows phone/social access without the removed language label. `Navbar` has active scroll-spy links for Sell, How It Works, Brands, and Contact; `Buy` opens a Coming Soon modal. `Hero` keeps the approved Rolls Royce visual, headline, valuation CTA, and a focused blur-to-sharp intro animation. The full-page intro is now a lightweight opacity fade only, so it does not stack expensive blur filters over the hero animation. `SellerAssurance`, `SellExperience`, `BrandBrowse`, `FlexibleInspection`, and `Contact` form the current homepage flow; removed sections include About/WhyChooseUs, Final CTA, Financing, Reviews, Vehicle Discovery, Featured Vehicles, and Body Type Browse. `SellExperience` uses the client-provided `dubaii.jpeg` Defender photo with dark gradients that blend into adjacent sections. `BrandBrowse` uses the framer-motion logo carousel with responsive columns. `Footer` now combines the former video band and footer into one compact, line-free footer: `footer.mp4` plays only while in view, the `CarVibeDubai` wordmark re-reveals on scroll, and footer contact/social/credit content sits directly below it. The valuation form/modal remains UI-only; lead persistence, OTP, Supabase, Gmail notifications, and CRM/admin flows are still planned for later milestones. WhatsApp validation accepts common UAE mobile formats such as `0564145781`, `971564145781`, and `+971564145781`. |

Replace examples with actual implemented features.

## 2026-09-14 staff-created manual leads

- Super Admin and Call Centre can open **Add lead** from the Leads Directory.
  Purchasers no longer see the button and the server rejects direct create
  requests from them.
- The compact internal form records Walk-in, Phone call, WhatsApp/message, or
  Other as the intake source. Referral incentives are deliberately excluded.
- Creator attribution comes from the authenticated server identity. Call Centre
  creators keep their own lead; all other creators route it to the next active
  Call Centre account without changing the Purchaser inspection handoff.
- The directory and PDF/Excel exports show the lead source. Duplicate phone
  numbers from the last 30 days are saved but clearly flagged for review.
- Manual leads may optionally include an inspection date and time. When present,
  the existing `Inspection Scheduled` status is saved and a Purchaser is
  assigned through the existing round-robin flow; when empty, the lead stays
  `New`.
- Added the `No Show` status for missed inspections. Super Admin and Call
  Centre can mark or reschedule it; Purchasers can see assigned No Show leads
  but cannot change the status. Business Overview and Leads filters include it.

## 2026-09-14 verified referral incentive

- Manual leads can record either an employee referral or a client referral.
  Every referral requires a written explanation and a private JPG, PNG, or PDF
  proof file. The lead creator and the employee referrer are separate records.
- Only employee referrals receive an incentive. The Super Admin sets the
  amount in Settings, and the amount is frozen when the related inventory car
  is marked Sold. A later setting change cannot alter a completed sale.
- The sold referral entry appears with the employee's ordinary commission in
  the existing staff payment/invoice flow. One Super Admin payment action
  settles both types of unpaid staff entry.

## 2026-09-23 catalog history, inspection reschedules, and commission privacy

- Vehicle Catalog activity now stays off the initial catalog request. Opening
  the right-side history drawer loads ten records, supports date/make/model/
  trim/staff search, and fetches more only when requested or scrolled near the
  end.
- A changed inspection appointment creates an Activity entry with the staff
  member and exact before/after time. After migration 0033, Super Admin/Owner
  and the assigned Purchaser receive the same private bell alert.
- Empty commission rows show `No commission yet` and do not offer an invoice.
  Purchaser Inventory shows only that Purchaser's stored unpaid 10% share;
  Call Centre and Developer shares are removed from both the table and payload.
- The sale confirmation no longer displays the Developer share. Staff invoice
  table columns are shortened/truncated safely so Profit and Date Closed do not
  overlap in the downloaded PDF.

## 2026-09-23 Call Centre commission privacy and branch address

- A Call Centre user can see their own 2% commission, customer, car, and sold
  date, but not company profit. The profit fields are removed from their
  Commission table, Details view, downloaded invoice, and server response.
- The shared public branch address and inspection report address now show
  `Al Quoz, Dubai, UAE` rather than a placeholder.

## 2026-09-24 permanent Scrap inquiry workflow

- The public Scrap Cars CTA opens a Scrap-specific enquiry mode with the
  normal OTP-protected contact and vehicle details plus required condition and
  asking-price fields. Photos are not requested.
- A Scrap inquiry is a normal lead with immutable `inquiry_type = 'scrap'`;
  it is not a new pipeline status and cannot be converted to a valuation lead.
- Super Admin/Owner and Call Centre can review Scrap Inquiries from the sidebar
  view and use existing Contacted, optional Inspection Scheduled, Arrived,
  inspection, Deal, and Closed operations. Only an owner can approve Scrap as
  a Deal. Inventory displays and filters the inherited Scrap origin.

## 2026-09-24 incomplete Scrap recovery

- A visitor who enters a valid name and phone number in the Scrap form is
  retained in the existing Incomplete Forms workspace even when they leave
  before OTP verification or final submission.
- Incomplete Forms has Valuation/Scrap filters and an explicit Scrap badge.
  The detail screen keeps any captured Scrap condition and asking price, then
  requires them before conversion to a real Scrap lead.
- The same phone may retain one incomplete valuation and one incomplete Scrap
  enquiry without either overwriting or blocking the other. Open enquiries of
  the same type remain protected from duplicate capture and OTP sends.
- Requires migration `0035_incomplete_scrap_inquiries.sql` after `0034`.

## 2026-10-01 reliable Step 1 incomplete-form capture

- Valuation and Scrap forms share one synchronous latest-values snapshot, so
  X, backdrop, Escape, consent changes, and browser exit read the final typed
  name and phone even when React has not rendered again yet.
- Valid UAE numbers continue to be required before creating an incomplete
  record. Invalid numbers now show the accepted format when the field loses
  focus; malformed contact data is not stored.
- Page exit still uses `sendBeacon` with a keepalive fetch fallback. Ordinary
  input capture waits five seconds after the latest change.
- Migration `0041_partial_lead_capture_sessions.sql` assigns one UUID and a
  monotonic revision to each opened form. Correcting a valid-looking phone
  typo moves/merges the same incomplete record, and delayed older requests
  cannot overwrite the correction. Phone plus inquiry type remains the
  cross-session dedupe key.

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
