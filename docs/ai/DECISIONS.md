# DECISIONS.md

Record only important decisions future developers must understand.

## ADR-001 — Commission is frozen at the moment of sale, not computed on read

**Date:** 2026-08-03
**Status:** Accepted

### Context

Milestone 3 pays the developer 2% of the profit on every car the owner buys and
resells. The owner types both figures the payment depends on — the purchase
price and the sale price — and can legitimately need to correct a typo later.

### Decision

When a car is marked sold, `sell_inventory_item()` (migration 0014) writes a
`commission_entries` row capturing the purchase price, sale price, profit, rate
and commission. Everything downstream reads that snapshot. The sale and its
entry are written in one transaction, and a sold car's figures are then
immutable — the API and the DB both refuse to change them.

### Alternatives

- Derive profit and commission live from `inventory` whenever a screen renders.
- Recalculate at the end of each quarter when the statement is produced.

### Consequences

- Correcting a purchase price after a sale is deliberately blocked rather than
  silently repricing an amount that may already have been invoiced and paid.
- The 2% rate can be renegotiated without rewriting the history of past
  payments, because each entry carries the rate it was calculated at.
- Costs the loss rule as agreed: `commission = max(profit, 0) × rate`. A loss
  records an entry at zero and never reduces commission owed on other cars.
- The rule now lives in two places — SQL (authoritative, what gets written) and
  `lib/admin/inventory.ts` (`previewCommission`, shown live while the owner
  types). Changing one without the other is a real hazard; both files say so.

## ADR-002 — Inventory is its own table, not columns on `leads`

**Date:** 2026-08-03
**Status:** Accepted

### Context

Every car currently comes from a website lead, one-to-one, so the purchase and
sale figures could simply have been extra columns on `leads`.

### Decision

A separate `inventory` table owns all the money, linked to the lead by a
`NOT NULL UNIQUE` foreign key with `ON DELETE RESTRICT`.

### Alternatives

- Add `purchase_price_aed` / `sale_price_aed` to `leads` and treat "Inventory"
  as a filtered view of leads at status `deal`.

### Consequences

- ISSUE-004 (no data retention/deletion policy) can be resolved without
  destroying financial history: lead personal data can be erased or anonymised
  while the commission ledger survives. `ON DELETE RESTRICT` enforces this
  rather than leaving it as an intention.
- Allowing stock that did not come from a lead (auction, walk-in, trade-in) is
  later a matter of dropping `NOT NULL` and adding a form — not a migration of
  the money onto a different table. The client scoped that out for now.
- Costs one extra fetch on the lead detail page to show what was paid.

## ADR-003 — Middleware verifies the session JWT locally, not against the auth server

**Date:** 2026-08-06
**Status:** Accepted

### Context

Every `/admin/*` page and every `/api/admin/*` request passes through
`middleware.ts`, which called `supabase.auth.getUser()`. That is not a local
check: it sends a request to Supabase's auth server on every single invocation.
Measured from the development machine, one round trip to this project is
**~450ms** (TCP 35–73ms, TLS 105–166ms, TTFB ~410–425ms warm, 1.09s cold).

The middleware then ran a second, sequential query for `must_change_password`,
so each request cost ~900ms before any real work began. Because every admin
page is a client component that fetches its data after hydration, one sidebar
click paid that toll twice — once for the navigation, once for the API call it
triggers — for **~2,250ms of strictly sequential network** before a row painted:

```
click → nav middleware (900ms) → hydrate → API middleware (900ms) → query (450ms)
```

### Decision

Use `supabase.auth.getClaims()` instead. This project signs its JWTs with an
**asymmetric ES256 key** (confirmed: `/auth/v1/.well-known/jwks.json` returns an
ES256 key, and the anon key is a new-style `sb_...` publishable key), so
`getClaims()` fetches the JWKS once and verifies each token's signature locally
with WebCrypto.

Separately, the `must_change_password` query is now gated to `isAdminPage`.
Both of its outcomes are redirects and an API route cannot be redirected, so on
`/api/admin/*` the query was executed and its result discarded, unread.

### Alternatives

- Keep `getUser()` and accept the latency.
- Cache the profile flag in a cookie — adds a staleness failure mode.
- Move `must_change_password` into the JWT via a Custom Access Token Hook.
  Still the best long-term answer; needs a migration and dashboard config.

### Consequences

- One sidebar click drops from ~2,250ms to ~900ms of network (~60% less).
- **The JWKS is fetched once per server process, not per request.** This matters
  because middleware constructs a new client per request. `GLOBAL_JWKS` in
  `auth-js` is module-level and shared across all instances with the same
  storage key; the constructor's apparent reset is dead code, since the getter
  returns a truthy `{ keys: [] }` fallback.
- **Session refresh is unchanged.** `getClaims()` calls `getSession()`
  internally, which refreshes an about-to-expire token before validating it, so
  the `setAll()` cookie handler still writes refreshed cookies as before.
- This remains real cryptographic verification, not a decode. A tampered,
  unsigned, or expired token is rejected; `exp` is validated by default.
- **The cost:** a session revoked server-side mid-token is no longer detected.
  A signed-out or deleted account keeps access until its access token expires —
  Supabase default **1 hour**. Shorten the project's JWT expiry to tighten that
  window. This was accepted deliberately for an admin dashboard with a small,
  known set of operators.
- Dropping the profile query on API routes changes no authorization:
  `must_change_password` never gated API access, only which page you land on.
  A first-login account calling the API directly was, and still is, allowed —
  pre-existing behaviour, not introduced here.

## ADR-004 — An abandoned form becomes a real lead when it is marked as a Deal

**Date:** 2026-08-09
**Status:** Accepted

### Context

`partial_leads` holds people who entered a phone number and then stopped. They
are kept out of `leads` on purpose: nobody proved the number belongs to them, so
treating them as leads would let anyone fill the pipeline with numbers they do
not own.

But the owner needs to record a car bought from one of these people. The
scenario is ordinary: someone starts the form, cannot be bothered to finish, is
called on the number they left, and agrees to sell. The car is real and the
money is real; only the form is incomplete.

The database forces the question. `inventory.lead_id` is `not null unique
references leads(id)`, and `record_lead_deal()` takes a lead id — so a car
cannot be recorded against a partial lead at all. The only alternatives were to
convert, or to not record purchases made this way.

### Decision

Marking a partial lead as **Deal** converts it into a real lead first, then
records the purchase through the existing `record_lead_deal()` path.

The converted lead is written with `source = 'recovered'` and
`phone_verified = false`, and the partial's `converted_lead_id` is set so it
disappears from Incomplete Forms — a person is never in both places.

**The admin supplies whatever the form never captured.** `leads` requires
`full_name`, `make`, `model` and `year`; a partial lead that stopped at step 1
has none of the car fields, since those are only captured at step 2. Rather than
refusing to convert, the Deal form asks for the missing values — the owner has
them, because they just agreed the purchase over the phone.

Provenance is read from `leads.source`, which already exists, rather than
snapshotted onto `inventory`. Inventory shows it as **"Unverified number"**,
because that — not which admin screen the record came from — is the fact that
changes what someone does next.

### Alternatives

- **Refuse to convert unless the form reached step 2.** Rejected: it reopens the
  same hole one step further along — a genuine purchase, agreed on the phone,
  still could not be recorded.
- **Let inventory reference a partial lead.** Rejected: it would mean two kinds
  of owner for a car, and every query that joins a car to its customer would
  have to handle both.
- **Add an `origin` column to `inventory`.** Rejected: two places stating the
  same fact, with no way to tell which is right when they disagree.

### Consequences

- A number that was never verified can now reach the `leads` table. This is
  acceptable **only** because the trigger is a purchase the business has already
  made — not a form submission — and it is marked as such rather than hidden.
- `phone_verified` becomes meaningful: it separates "proved they own this
  number" from "we bought their car".
- The OTP gate treats a converted lead like any other, so the same number is
  refused a new code until that lead reaches `deal` or `closed`.
- No migration is required. `leads.source` and `partial_leads.converted_lead_id`
  both already exist.
- Activity history stays unavailable while a record is still partial:
  `lead_events.lead_id` references `leads(id)`, so a timeline before conversion
  would need a new table. Deferred deliberately — the audit trail matters most
  after the money moves, and that is after conversion.

## ADR-005 — Incomplete-form CSR recovery and Purchaser handoff

**Date:** 2026-09-10
**Status:** Accepted

### Context

An incomplete form contains unverified, sometimes missing details. Treating it
as a normal lead too early exposes it to the Purchaser team and makes pipeline
reporting less trustworthy.

### Decision

New incomplete forms are round-robin assigned to an active Call Centre agent.
That CSR verifies and completes the customer and vehicle details during the
follow-up. Selecting **Inspection Scheduled** requires those details plus an
inspection time, then creates the real lead and round-robin assigns an active
Purchaser. The later inspection, negotiation, deal, and not-purchased work
happens only on that real lead.

Purchasers cannot list or open incomplete forms. Owners retain visibility and
may reassign the Call Centre owner, but no Purchaser is assigned before the
conversion.

### Consequences

- A saved capture is not counted as a confirmed lead.
- The handoff is auditable through the converted lead and its assignment event.
- A conversion rechecks the partial record before linking it, so a concurrent
  second conversion cannot leave a second live lead behind.
- Migration `0026_partial_lead_csr_handoff.sql` is required before this flow is
  active against a Supabase database.

## ADR-006 — Arrival is separate from inspection completion

**Date:** 2026-09-13
**Status:** Accepted

### Decision

Customer arrival is an independent, one-way operational fact (`not_arrived` to
`arrived`), recorded by assigned Call Centre staff only after a Purchaser has a
saved inspection appointment. A Purchaser may not set a lead to `inspected`
from the normal dropdown. They must complete the report, required checks, and
24 photos with required notes; the server then makes the report, lead status, and audit event
transition together.

### Consequences

- The dashboard/list can distinguish a scheduled customer from one who
  physically arrived.
- A draft inspection does not inflate the Inspected pipeline count.
- The required report and photo data are private operational records and need
  migrations `0027_inspection_arrival_reports.sql` and
  `0028_inspection_audit_retention_vin.sql` before use.
- Completed reports remain editable by the assigned Purchaser and Super Admin;
  each saved card and photo replacement is audited.
- Photo files are removed 60 days after sale; report data and history remain.

## ADR-007 — Vehicle catalog entries are archived, not permanently deleted

**Date:** 2026-09-14
**Status:** Accepted

### Decision

Catalog Make, Model, and Trim removals set an archive timestamp. Archived
entries disappear from the public valuation form, preserve historic vehicle
records, can be restored by an owner, and write an admin-only activity entry.
Case-insensitive partial unique indexes prevent duplicate active entries across
concurrent tabs.

### Consequences

- Migration `0029_catalog_safety_activity.sql` is required before archive and
  activity features are active in Supabase.
- The deployed application remains readable and can still add catalog entries
  before that migration; it refuses archival rather than performing a risky
  permanent delete.

## Template

## ADR-008 — Scrap is immutable provenance, not a lead status

**Date:** 2026-09-24
**Status:** Accepted

### Decision

Scrap enquiries use the existing lead and inspection workflow but retain an
immutable `inquiry_type = 'scrap'`. They may reach Inventory after owner
approval, where the origin is read from the linked lead. They are never
converted to ordinary valuation leads.

### Consequences

- Reporting can measure Scrap activity and stock without duplicate records.
- Existing assignment, arrival, inspection, Deal, and Closed safeguards are
  reused rather than reimplemented.
- The database trigger protects the classification even if a future UI is
  changed incorrectly.

## ADR-009 — Abandoned Scrap enquiries stay in Incomplete Forms

**Date:** 2026-09-24
**Status:** Accepted

### Decision

An abandoned Scrap form is stored in the existing `partial_leads` recovery
workflow as `inquiry_type = 'scrap'`, not in a second queue and not as a
valuation. It becomes a real Scrap lead only after Call Centre completes the
required details and schedules an inspection.

### Consequences

- Staff have one recovery workspace with a clear type filter, instead of two
  competing queues.
- A Scrap enquiry is permanently traceable from its first captured contact
  details through Inventory or Closed.
- The same phone can have one valuation and one Scrap enquiry without one
  silently overwriting the other.
- Unverified records remain Call Centre recovery tasks and never reach a
  Purchaser directly.

## ADR-Referral incentive snapshot at sale

**Date:** 2026-09-14
**Status:** Accepted

### Decision

Employee referral incentive eligibility is recorded with a proof-backed manual
lead, but the payable amount is copied from Settings only when the vehicle is
marked Sold. The entry is paid through the existing staff commission payment
flow.

### Consequences

Changing the setting affects future sold vehicles only; historic sold entries
remain auditable and unchanged.

## ADR-010 — Staff payouts use immutable payment records

**Date:** 2026-09-27
**Status:** Accepted

### Decision

One Staff **Mark as Paid** action creates one immutable payout record, linked to every role-commission and referral-incentive row settled by that action. It records the frozen total, included sales, UAE payment timestamp, and Super Admin confirmer.

### Consequences

- Current unpaid commission can correctly become zero without erasing accounting evidence.
- Staff Details can show each payment and the exact sales included, while the Commission page can show recent payments without a separate manual payout form.
- Pre-feature paid rows preserve their amount and timestamp but cannot truthfully name a confirmer, so they are labelled accordingly rather than inventing one.

## ADR-011 — Temporary pause of public WhatsApp OTP (plan only)

**Date:** 2026-09-27
**Status:** Implemented locally; deployment pending

### Decision

Per Sir Nash's 25 September meeting instruction, plan a reversible pause of public WhatsApp OTP for both valuation and scrap submissions. New bypass-mode leads must be saved with `phone_verified=false`; historical verification records and the OTP schema must remain intact. A server-owned mode, server-side abuse controls, and real submission persistence are prerequisites. See `docs/ai/OTP_TEMPORARY_BYPASS/README.md` for the implementation and restoration checklist.

### Consequences

Customer phone ownership will be unverified during the pause, so staff must treat it as such. The local implementation uses one server-owned mode for both forms and both OTP endpoints, existing lead UUIDs for retry idempotency, and no database migration. Production behavior does not change until deployment; persistent cross-instance abuse limits and staging/mobile verification remain release considerations.

## ADR-XXX — Decision title

**Date:**  
**Status:** Proposed | Accepted | Rejected | Superseded

### Context

Why was a decision needed?

### Decision

What was chosen?

### Alternatives

- Option A
- Option B

### Consequences

What becomes easier, harder, required, or prohibited?

## ADR-012 - Arrival confirmation expires when an inspection is rescheduled

**Date:** 2026-09-27
**Status:** Accepted

### Decision

Customer arrival confirms one specific inspection appointment, not the lead
forever. When a saved inspection date/time changes, the server clears an
existing arrival confirmation and its actor/timestamp, writes an audit event,
and requires a new Call Centre confirmation. The shared lead endpoint applies
this to both Regular and Scrap enquiries.

### Consequences

- Purchaser and Super Admin cannot start inspection for the new appointment
  until the new arrival has been confirmed.
- Notes-only saves and an unchanged appointment preserve a valid confirmation.
- No database migration is required; existing arrival columns are reused.

## ADR-014 - Developer share is payable anytime

**Date:** 2026-09-27
**Status:** Accepted

### Decision

Developer commission statements remain monthly records, but payment is not
blocked by a calendar quarter. Super Admin can settle every currently unpaid
monthly statement in one deliberate payment action. Quarterly timing is a
recommended operating rhythm, not a system requirement.

### Consequences

- The primary screen communicates one amount available now and one payment
  action, instead of making the operator understand quarter grouping.
- A later sale creates a new unpaid monthly statement even if an earlier
  payment was made in the same calendar quarter.
- Existing statement rows, payment dates, and immutable per-sale commission
  calculations remain unchanged; no migration is required.

## ADR-013 - Purchasers may record assigned Scrap deals

**Date:** 2026-09-27
**Status:** Accepted

### Decision

Scrap remains immutable lead provenance, but it does not change the Purchaser's
normal authority to complete a Deal for their assigned, inspected lead. The
same server-side purchase price validation and atomic Inventory creation are
used for Regular and Scrap leads.

### Consequences

- Purchasers can no longer receive a forbidden response solely because the
  assigned lead originated as Scrap.
- Call Centre still cannot record Deal, and lead ownership checks remain active.
- No database migration is required.
