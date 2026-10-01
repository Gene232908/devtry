# DATABASE_PLAN.md

This is a draft until `FINISH THE PRODUCT`.

## 2026-10-01 incomplete-form retention

- Migration `0040_partial_lead_retention.sql` adds `partial_leads.archived_at`, bounded retention indexes, an aggregate-only retention-run ledger, and a service-role-only transactional cleanup RPC.
- Only unconverted incomplete forms are eligible. Inactivity is measured from `updated_at`: archive after 30 days and permanently delete after 90 days. Deleting a partial also removes its child `partial_lead_events` through the existing cascade.
- Confirmed `leads`, converted partials, inspection data/photos, Inventory, financial/audit ledgers, and Vehicle Catalog records are outside the function's delete target.
- A new capture or staff activity advances `updated_at`; if the same unconverted record was archived, a database trigger clears `archived_at` so it returns to the active recovery queue without creating a duplicate.


## 2026-09-25 Expense and financial confirmation ledger

- `inventory_expenses` stores manual, AED-denominated vehicle costs with a description, creator, and timestamps. It is linked to Inventory so it survives the lead-to-stock workflow.
- `inventory` receives an expense total, net-profit snapshot, financial review state, version, and confirmation actor/time. New Sold records are `awaiting_confirmation`; only `finalize_inventory_finances()` writes commission records.
- A financial review version prevents stale confirmation. Expense mutations, finalization, and reopening lock the Inventory row, so duplicate confirmation cannot create duplicate commission entries.
- Reopening is limited to unpaid confirmed sales; paid staff/developer commission locks ordinary edits. The audit table records confirmation and reopening reasons.
- No migration backfills or recalculates historical/demo sales. The automatic employee referral insert is removed for future sales; existing referral records remain readable.

## 2026-09-27 staff commission payout history

- Migration `0039_staff_commission_payment_history.sql` adds `staff_commission_payments` and links the role-commission and referral-incentive rows settled in one Staff **Mark as Paid** action.
- Each payout freezes the paid total, number of entries, UAE timestamp, and confirmer ID/name. The linked commission rows retain their original per-car amounts, so payment history remains explainable even after current unpaid totals become zero.
- Pre-feature paid rows are grouped by their existing exact `paid_at` timestamp to preserve the historical amount/date. They are explicitly labelled as missing a confirmer because the old workflow did not store one.

## Principles

- UUID primary keys.
- Foreign keys.
- Constraints.
- Useful indexes.
- Timestamps.
- Least privilege.
- Supabase RLS.
- Private storage for personal documents.
- Tracked SQL migrations.
- Development-only seed data.

## Candidate tables

- profiles
- branches
- vehicles
- vehicle_images
- clients
- bookings
- payments
- agent_assignments
- audit_logs

## Draft lead fields from Sir Nyash form answers

Public lead capture now needs to support:

- full name
- WhatsApp/phone number accepted from common UAE mobile input formats and stored later in normalized UAE/E.164 format
- year
- make
- model
- mileage or mileage bracket
- condition
- inspection emirate/location
- consent timestamp
- lead status / CRM pipeline stage later

The inspection emirate options currently used in the UI are Abu Dhabi, Dubai, Sharjah, Ajman, Fujairah, Ras Al Khaimah, and Umm Al Quwain.

Current UI validation accepts local UAE mobile numbers such as `0564145781` and country-code mobile numbers such as `971564145781` or `+971564145781`, with spaces or dashes ignored. Final backend storage should normalize accepted numbers before saving or sending OTP messages.

Sir Nyash also requested make/model dropdowns that can be updated without always needing the developer. Final Supabase design should consider editable vehicle option tables or settings-backed dropdown values.

## 2026-09-13 arrival, specification, and inspection-report schema

Migration `0027_inspection_arrival_reports.sql` adds `vehicle_specifications`,
lead and partial-lead Specification values, independent arrival fields,
`inspection_reports`, `inspection_photos`, a private JPG/PNG-only 8 MB storage
bucket, and the atomic `complete_inspection_report(...)` function. Migration
0028 adds mandatory notes and 24 photo angles, transactional report/photo audit
writes, Inventory VIN synchronization, and 60-day post-sale photo deletion.
Report information remains; broader lead-personal-data retention still needs
business/legal approval.

## 2026-09-14 catalog safety schema

Migration `0029_catalog_safety_activity.sql` adds `archived_at` fields to the
three vehicle catalog tables, partial case-insensitive unique indexes for active
entries, and an owner-only `catalog_activity` audit table. Catalog references in
leads and inventory are historical text values, so archiving keeps historical
records intact without rewriting them.

## 2026-09-14 manual lead attribution

Migration `0030_manual_leads.sql` adds nullable `leads.created_by`, linked to
the authenticated staff profile. Manual intake uses the existing `source`
column with `manual_walk_in`, `manual_phone_call`, `manual_whatsapp`, or
`manual_other`; detailed source context is preserved in the creation event.
Referral incentive and payout data are not part of this migration.

## Future marketplace UI data needs

The 2026-07-03 homepage redesign added UI-only preview sections for future buy-car and financing flows. These sections do not use live data yet. If approved later, the database will need to support:

- vehicle inventory records
- vehicle images and listing status
- brand, model, body type, fuel, transmission, year, mileage, and price filters
- financing estimate inputs and partner/bank metadata if officially provided
- customer review records with approval/verification status
- request-a-car leads separate from sell-my-car valuation leads if the client wants both flows

Do not finalize fields until actual implemented features and client rules are audited.

## Current sell-side homepage data implications

The 2026-07-03 premium refinement shifted the public homepage back toward Milestone 1 selling/valuation. The new accepted-brand badges, vehicle profile cards, and body-type guidance are static UI content for now. If the client later wants these editable from an admin dashboard, plan for:

- accepted vehicle brands and model families
- brand display order and active/inactive status
- accepted body types and valuation notes
- valuation profile descriptions and review criteria
- optional brand/logo asset management if official assets are provided

These do not create new public lead fields today. The actual lead capture remains the existing free valuation form fields until backend approval.

## Required final outputs

## Incomplete-form recovery handoff — implemented locally 2026-09-10

- `partial_leads.call_center_id` owns the unverified recovery record.
- Open partial records have no `purchaser_id`; Purchaser ownership starts only
  after conversion to `leads` at Inspection Scheduled.
- `partial_lead_events.type` accepts `assigned` as well as note and status
  events, so recovery ownership is auditable.
- `capture_partial_lead` receives a server-selected CSR ID. The public browser
  never selects an assignee.
- `partial_leads.status` supports historical lead vocabulary in the database,
  while the UI exposes only pre-conversion stages. Migration 0026 must be run.

After `FINISH THE PRODUCT`:

## Referral incentive data â€” 2026-09-14

- Migration `0031_referral_incentives.sql` adds
  `settings.referral_incentive_aed`, `lead_referrals`, private
  `referral-proofs` storage, and `staff_referral_incentives`.
- A `lead_referrals` row permits exactly one employee or one client referrer.
  It stores both a required explanation and proof-object metadata; the proof
  itself remains in a non-public storage bucket.
- `sell_inventory_item` creates one employee incentive per sold inventory
  item, copying the current setting into the immutable `incentive_aed` field.
  Client referrals never create an incentive entry.
- Migration `0036_zero_referral_incentive_guard.sql` prevents zero-value
  referral rows from becoming payable commission entries; existing reads also
  exclude any legacy zero-value rows.

- Migration `0032_no_show_status.sql` adds the `no_show` value to the existing
  `lead_status` enum. No new table or environment variable is required.

- SQL migrations.
- Tables and relationships.
- Constraints and indexes.
- RLS policies.
- Storage buckets and policies.
- Supabase repository adapters.
- Environment template.
- Security and integration tests.
- Updated documentation.

## Inspection schedule notifications - 2026-09-23

- Migration `0033_inspection_schedule_notifications.sql` adds one private,
  recipient-scoped notification row per inspection reschedule event.
- The permanent before/after audit record remains in `lead_events`; notification
  rows only track delivery and `read_at` state for active Super Admin/Owner and
  the assigned Purchaser.
- Each row snapshots the lead name, assigned Purchaser name, old appointment,
  new appointment, and staff member who changed it. The notification does not
  change the lead, appointment, or commission data.

## Scrap inquiry provenance - 2026-09-24

- Migration `0034_scrap_inquiries.sql` adds `leads.inquiry_type` (valuation or
  scrap), `scrap_condition`, and `scrap_asking_price_aed`.
- `inquiry_type` is immutable through a database trigger. Inventory reads the
  origin from its linked lead rather than storing a duplicate source field.

## Incomplete Scrap recovery - 2026-09-24

- Migration `0035_incomplete_scrap_inquiries.sql` adds immutable-at-conversion
  context to `partial_leads`: `inquiry_type`, `scrap_condition`, and
  `scrap_asking_price_aed`.
- The partial-lead dedupe key is `(phone_e164, inquiry_type)`, allowing one
  abandoned valuation and one abandoned Scrap enquiry for the same customer.
- The server-selected Call Centre assignee remains the only assignment input
  accepted by `capture_partial_lead`; public browsers cannot choose an owner.
- `mark_partial_lead_converted` receives the inquiry type so completing one
  form does not hide the other type for the same phone number.
- OTP verification records also store `inquiry_type`, binding a proof to the
  form type that requested it before a lead can be inserted.

## Mileage unit preservation - 2026-09-25

- Migration `0037_mileage_units.sql` adds `mileage_value` and `mileage_unit`
  (`km` or `miles`) to both confirmed and incomplete enquiries.
- `mileage_km` remains the canonical rounded-kilometre field used by existing
  internal workflows. The original whole-number value and unit are retained for
  staff-facing display and exports, so a customer-entered Miles value is never
  silently presented as KM.

## Incomplete-form capture sessions - 2026-10-01

- Migration `0041_partial_lead_capture_sessions.sql` adds nullable
  `capture_session_id` and non-negative `capture_revision` to
  `partial_leads`, plus a partial unique session/type index.
- The service-role-only capture RPC moves the same unconverted row when a
  visitor corrects their phone, merges into an existing phone/type row when
  necessary, and ignores out-of-order lower revisions.
- Legacy clients without a session id retain the existing phone/type upsert.
