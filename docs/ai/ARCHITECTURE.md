# ARCHITECTURE.md

## Preferred flow

```text
UI
→ feature hook or controller
→ service or repository interface
→ mock adapter now
→ Supabase adapter later
```

The UI must not directly depend on Supabase-specific code.

## Recommended feature structure

```text
features/
  vehicles/
    components/
    hooks/
    services/
    repositories/
    schemas/
    types/
    tests/
```

## Responsibilities

### Executive Overview data flow

`app/(admin)/admin/page.tsx` resolves an active owner, server-renders the
initial seven-day executive Overview, and passes that seed to the client
dashboard. `lib/admin/executive-overview.ts` aggregates existing leads, events,
inventory, profiles, and commission entries. The owner-only
`/api/admin/overview` route serves date-range and custom comparison refreshes.

Lead detail Activity is served by `/api/admin/leads/[id]/events`. It records
each authenticated staff member's distinct view with the actor and role
snapshot, and returns those events to users who are authorized to see the lead.
Saving a follow-up note or changing status also writes an actor-stamped event:
the editable lead note remains the latest working note, while `lead_events`
preserves the dated history. No new dashboard tables or business formulas were
added.

### Incomplete-form recovery data flow

The public partial-capture API chooses an active Call Centre owner on the
server and passes that ID to the service-role capture RPC. Admin/Manager users
can view recovery work; a Call Centre user is scoped to their own assigned
captures; Purchasers are blocked from both the list and detail API.

When a CSR selects **Inspection Scheduled**, the detail API validates the
manually confirmed customer/car data and appointment time, creates a `leads`
record, links the partial record, and server-selects an active Purchaser. From
that point, the normal Leads workflow owns the record. The partial activity
table records follow-up notes, status changes, and assignment history.

### Arrival and inspection report data flow

`vehicle_specifications` is read by the public valuation form, the CSR recovery
form, and the Purchaser inspection workspace. Super Admin manages it through
server-authorized Catalog routes; public submission and recovery conversion
validate the chosen value against that table.

Arrival is `leads.arrival_status`, never a lead pipeline status. Only the
assigned Call Centre user can set it to `arrived`, and the server requires an
inspection-scheduled lead with an assigned Purchaser. Purchasers see the result
on their assigned list. Inspection drafts and private JPG/PNG photos use
server routes; completion calls a service-role RPC that completes the report,
marks the lead Inspected, and adds the audit event atomically.
Migration 0028 extends this to 24 note-required photos, editable completed
reports, per-card/photo audit events, Inventory VIN synchronization, and a
CRON_SECRET-protected daily 60-day post-sale photo cleanup. Cleanup removes
private photo objects and photo rows but keeps report JSON and lead events.
Completed report export keeps authorization/storage retrieval in the API route
and delegates print layout to `lib/inspection/pdf-report.ts`. File naming is a
small shared helper so the server attachment and Purchaser browser download use
the same make/model/year title without bundling `pdf-lib` into the client.

### UI

- Renders data.
- Handles user interaction.
- Shows loading, empty, success, and error states.

### Feature logic

- Coordinates forms, state, permissions, and services.

### Domain

- Contains business rules and shared types.

### Data layer

- Contains repository interfaces.
- Uses mock adapters now.
- Uses Supabase adapters after approval.

## Architecture update rule

Update this file only when folder structure, data flow, state management, shared abstractions, or integration boundaries change.
