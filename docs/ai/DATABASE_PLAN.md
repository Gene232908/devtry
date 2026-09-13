# DATABASE_PLAN.md

This is a draft until `FINISH THE PRODUCT`.

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

- SQL migrations.
- Tables and relationships.
- Constraints and indexes.
- RLS policies.
- Storage buckets and policies.
- Supabase repository adapters.
- Environment template.
- Security and integration tests.
- Updated documentation.
