# KNOWN_ISSUES.md

Record unresolved bugs, risks, and technical debt.

## ISSUE-010 — The database is in Tokyo; the users are in Dubai

**Severity:** Medium (decides how the dashboard feels in production)
**Status:** Partly addressed — Vercel pinned to Tokyo to match; the region choice
itself is still worth revisiting

**Confirmed 2026-08-08:** the Supabase project (`giqciotzdfhvokbdvnft`, "c db")
runs in **`ap-northeast-1` — Northeast Asia (Tokyo)**, on a NANO t4g.nano
instance. The people who will use this dashboard are in **Dubai / UAE**.

Tokyo is roughly 7,900 km from Dubai. That is close to the worst reasonable
choice for a UAE audience, and no amount of application work can undo it —
`vercel.json` now pins the functions to `hnd1` (Tokyo) so at least the function
and the database are co-located, which is what matters most given the pages are
server-rendered and some screens issue several sequential queries (the
commission builder runs one RPC per month).

**The better end state is to move the database closer to the users:**
`ap-south-1` (Mumbai) is the nearest Supabase region to the UAE, followed by
`eu-central-1` (Frankfurt). Pair it with `bom1` on Vercel.

**Why now is the cheapest possible moment:** the test dataset was cleared on
2026-08-07, so the database holds only schema, the vehicle catalogue and two
admin accounts. Migrating means running migrations 0001–0017 against a new
project, re-seeding the catalogue and recreating the two admins — not moving
live customer records. Every week of real traffic makes this harder.

Supabase cannot change a project's region in place; it means creating a new
project and repointing `NEXT_PUBLIC_SUPABASE_URL`, the anon/publishable key and
`SUPABASE_SERVICE_ROLE_KEY`.

Note the user's own location (Philippines) is irrelevant to production — it only
affects how the local dev server feels.

After removing every avoidable round trip (see the 2026-08-07 CHANGELOG), a
sidebar navigation costs almost nothing in application code. What is left is
network latency to Supabase, measured from the development machine with the
database **empty**:

| | |
|---|---|
| TCP connect (Cloudflare edge) | 63–102 ms |
| TLS complete | 178–218 ms |
| TTFB, `/auth/v1/health` (no DB work) | **319–353 ms** |
| Inventory / Blocked / Dashboard queries | 146–326 ms each |

Those numbers are distance, not code — an empty table cannot be queried faster.

**This mostly disappears in production, but only if the regions match.** In
production the query is not laptop → Supabase, it is *Vercel function* →
Supabase. Co-located, that is single-digit to low-double-digit milliseconds.
Crossing an ocean, it stays where it is now.

There is **no `vercel.json`**, so Vercel is choosing its own default region
(historically `iad1`, US East). If the Supabase project is not in US East, every
query on every page load pays an avoidable ocean crossing.

**What to do:**

1. Read the project region in the Supabase dashboard (Settings → General).
2. Add a `vercel.json` pinning the function region to the nearest match, e.g.
   for Supabase in Singapore (`ap-southeast-1`):
   ```json
   { "regions": ["sin1"] }
   ```
3. Re-measure a sidebar navigation on the deployed site.

Note that the *user's* location barely matters for this — the pages are
server-rendered, so the trip that counts is between the function and the
database. Serving UAE customers from a function next to a Singapore database is
correct; serving them from a US function next to a Singapore database is not.

## ISSUE-009 — Inconsistent rows in the live database

**Severity:** Low (one row remains; it is legacy test data, and no money moves through it)
**Status:** Partly resolved — 1 of 2 repaired on 2026-08-07

Found by auditing the live `leads → inventory → commission_entries →
commission_statements` chain.

**Context that matters:** every lead in the database is test data. Six of the
seven share the phone `+639763331768` (the developer's own number), the seventh
uses the UAE dummy `+971501234567`, and the descriptions and notes are keyboard
mashing (`QWEQWE`, `ashjgasd`, `weweq`). There is no real customer data here.

### 1. Lead `c9d5ad7a` ("Gene") — RESOLVED 2026-08-07

Sat at `pending` while owning inventory `38501161` (2026 Rolls-Royce Ghost,
AED 111,111). Its history showed `deal → pending` at 16:20:06 and again at
16:22:24 on 2026-08-06, caused by the detail form silently resetting its status
field from a stale `lead` prop so the next Save wrote it back.

Repaired at the owner's direction by setting the lead back to `deal`, matching
the car recorded against it. One column on one row; a backup was taken first
and a `lead_events` row was written so the repair is visible in the timeline
rather than appearing as an unexplained state change. The audit reports the
lead/inventory pair as consistent afterwards.

Both causes are fixed, so this cannot recur: the form no longer rebuilds its
whole draft from the lead prop, and `PATCH /api/leads/[id]` refuses (409) to
move a lead out of `deal` while a car exists for it.

### 2. Lead `b14e7b55` ("gene") — OPEN

Sits at `deal` with no inventory row. Its events show
`value_updated {value: 20000}` rather than `car_purchased`, so it was set to
Deal under the pre-0014 code, before recording a deal created inventory. This
is legacy data, not a live defect, and it earns no commission because
commission is only created when a car is sold.

*Decision needed:* whether this represents a car that was actually bought and
should be back-filled into Inventory, or should simply be moved off `deal`.
Given it is test data, deleting it is also reasonable.

## ISSUE-001 — Backend not yet approved

**Severity:** Expected limitation  
**Status:** Resolved (code-complete; one manual step remaining)

`FINISH THE PRODUCT` was sent on 2026-07-17. The Supabase/Twilio backend from
the `wip-backup-before-milestone1` branch was restored into `main` and adapted
to the current valuation form (Trim, Describe Your Car, Basic/Mid/Full Option
instead of the old excellent/good/fair condition field). See `WORK_LOG.md`
2026-07-17 for the full breakdown.

**Remaining manual step:** migration `supabase/migrations/0006_trim_and_option_level.sql`
has not been run against the live Supabase project yet (adds `trim`,
`description`, `option_level` columns to `leads`, plus BMW to the vehicle
catalog). Run it in Supabase -> SQL Editor before relying on those fields
end-to-end. Migrations 0001-0005 were already applied previously (confirmed
live via `/api/vehicles` returning real seeded catalog data).

## ISSUE-006 — `next build` while `next dev` runs breaks the dev server

**Severity:** Low (recurring nuisance, no data at risk)
**Status:** Resolved

Both commands write to `/.next`. Running a build while the dev server is up
replaces its compiled CSS chunks with production ones, and the running site then
serves correct HTML with dead stylesheet links — every page renders as unstyled
plain HTML. It has bitten this project repeatedly; several `WORK_LOG` entries end
with "stale Node processes stopped, `.next` cleared, `npm run dev` restarted".

**Fix:** `npm run build:check` (`scripts/build-check.mjs`) runs the same build
against `.next-build` via the `NEXT_DIST_DIR` env var now read by
`next.config.mjs`. Use it for verification whenever a dev server might be
running; plain `npm run build` is still what deploys.

**Recovery if it happens again:** stop the dev server, `rm -rf .next`, restart
`npm run dev`, then hard-refresh the browser.

## ISSUE-005 — Migrations 0014-0016 not yet applied; money paths untested live

**Severity:** High (blocked the Milestone 3 feature entirely)
**Status:** Resolved 2026-08-03 — schema applied and verified; UI path still needs one real run

All three migrations were run against the live Supabase project and verified
directly: `inventory`, `commission_entries` and `commission_statements` all
return 200; both new enum values accept queries; and all four functions execute
(`record_lead_deal`, `sell_inventory_item` and
`set_commission_statement_status` each returned their own guard message against
a deliberately invalid id, proving the plpgsql bodies ran, and
`build_commission_statement` returned the same row id on a second call,
confirming it is idempotent).

`ADMIN_PREVIEW` is now `false`, so the dashboard reads and writes the real
database.

**Still outstanding:** no one has yet driven the full flow through the browser —
Deal → purchase price → mark sold → check the Commission tab. The SQL is proven;
the UI wiring on top of it is not.

### Original report

Three migrations have been written but not run against the live Supabase project:

- `0014_inventory_and_commission.sql` — `inventory` and `commission_entries`
  tables, `record_lead_deal()`, `sell_inventory_item()`.
- `0015_pipeline_statuses.sql` — adds the `inspection_scheduled` and
  `negotiating` lead statuses.
- `0016_commission_statements.sql` — monthly `commission_statements`,
  `commission_entries.statement_id`, `build_commission_statement()` and
  `set_commission_statement_status()`.

Run them in order. Until they do:

- Marking a lead as **Deal** will fail — `record_lead_deal` does not exist yet.
- Selecting the two new statuses will fail — the enum values do not exist yet.
- `/admin/inventory` and `/admin/commission` will show a load error against a
  live database.

The dashboard is still in preview mode (`ADMIN_PREVIEW = true`), so the demo
walkthrough works regardless — the failure only appears on the live path.

**No end-to-end test has been run against a real database.** Type-check, lint,
unit tests (52) and the build all pass, and the commission arithmetic and period
grouping are unit-tested, but none of the four SQL functions has ever executed.
They need a real run before this is trusted with money: record a deal, mark the
car sold, confirm the frozen `commission_entries` row matches what the UI
previewed, then check the month's statement totals it.

## ISSUE-007 — Public pages felt sluggish to click; caused by the brand marquee

**Severity:** Medium (user-visible on every public page)
**Status:** Resolved 2026-08-03

Clicks and navigation on the public site lagged. Measured cause: `BrandMarquee`
rendered the full ~150-logo catalogue, duplicated for the seamless loop, which
put **300 tiles / 303 `<img>` / 345 KB of HTML** on the page before a single
image loaded. Three compounding costs:

1. Every tile was its own `<button>` with its own handler, so React had to
   hydrate 300 interactive elements before the page responded to anything —
   this was the "delay when clicking".
2. The belt was **72,000px wide** carrying `will-change: transform`, roughly
   ten times the usual GPU texture ceiling, forcing continuous re-rasterisation
   for as long as the (infinite) animation ran.
3. Horizontal looping meant images kept entering the viewport, so the main
   thread never stopped decoding.

Server response time was never the problem — measured 60-100ms throughout.

**Fix:** the marquee now samples 32 logos at an even stride (variety kept), the
whole belt is one `<button>` instead of 300, and `will-change` is gone.
Result: **HTML 345 KB → 123 KB, 303 → 67 images, 302 → 1 marquee button,
belt 72,000px → 15,360px.** Tune `MARQUEE_LOGO_COUNT` to trade variety for cost.

## ISSUE-008 — No security headers were set

**Severity:** Medium
**Status:** Resolved 2026-08-03 (with one deliberate gap)

`next.config.mjs` set no headers at all — 0 of the 4 standard protections, and
`X-Powered-By` was advertising the framework. Build plan §12 requires them.

**Fix:** CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` and HSTS are now set on every response; `/admin/*` and
`/api/*` additionally send `X-Robots-Tag: noindex, nofollow`;
`poweredByHeader` is off.

**Known gap:** the CSP allows `'unsafe-inline'` for scripts, because the App
Router emits inline bootstrap scripts and removing it requires per-request
nonces generated in middleware. `frame-ancestors`, `object-src`, `base-uri` and
`form-action` are all strict. Nonce-based CSP is the correct follow-up and
should be done as its own change, not bundled with unrelated work.

## ISSUE-003 — Admin leads list has no pagination

**Severity:** Low (pre-existing, inherited from the restored backend)
**Status:** Mitigated 2026-08-03 — capped, but not truly paginated

`GET /api/admin/leads` fetched every row with no limit. It now caps at 1000 and
returns `truncated: true` when the ceiling is hit, plus a server-side warning.

This is a guard, not a fix. The dashboard still loads the whole set once and
pages through it in the browser, so real server-side pagination is still
required before lead volume approaches the cap — and the UI does not yet
surface `truncated` to the user.

## ISSUE-004 — No documented data retention/deletion policy

**Severity:** Medium (UAE privacy compliance gap)  
**Status:** Open

The `leads` table stores personal data (name, phone, email, car details)
with no retention period or deletion process defined yet. `SECURITY_COMPLIANCE.md`
requires this documented before production; still needs client/legal input
on how long lead data should be kept and how deletion requests are handled.

Inspection-photo retention is resolved separately by migration 0028: private
inspection photos are deleted 60 days after sale while report information and
audit events remain. Lead names, phone numbers, email, and other personal data
are still covered by this open issue.

## ISSUE-002 - WhatsApp number format too strict

**Severity:** Low  
**Status:** Resolved

**Description:**  
The public valuation form only accepted the exact `+971...` format, so a valid UAE number typed as `971564145781` or `0564145781` was rejected.

**Impact:**  
Some customers could not continue past Step 1 even when they entered a valid UAE mobile number.

**Affected feature:**  
Public valuation form.

**Workaround:**  
Previously, users had to enter the number exactly as `+971...`.

**Planned fix:**  
Allow local UAE mobile and country-code UAE mobile input formats while still rejecting non-UAE mobile numbers.

**Resolved date:**  
2026-07-02

### ISSUE-006 - Missing partial lead activity RPC on existing Supabase project

**Severity:** Medium  
**Status:** Resolved in API fallback; migration still recommended

**Description:** The `partial_lead_events` table existed, but the `update_partial_lead_follow_up` RPC was absent from the Supabase schema cache. Saving a note or status on Incomplete Forms therefore failed.

**Workaround:** The admin API now falls back to a validated update plus activity inserts when the RPC is missing.

**Planned fix:** Apply migration `0021_partial_lead_activity.sql` so future updates use the transactional RPC path.

### ISSUE-007 - Inspection/arrival migration not yet applied remotely

**Severity:** High
**Status:** Open

**Description:** Source code expects migration `0027_inspection_arrival_reports.sql`.
Until it runs on the intended Supabase project, the new specification, arrival,
inspection report, photo storage, and atomic-completion workflow cannot operate.

**Workaround:** Do not use the new workflow on that environment yet; existing
lead reads degrade to their prior fields.

**Planned fix:** Apply the tracked migration through the approved Supabase SQL
process, add Super Admin Specification options, then perform a non-production
end-to-end test.

## Issue template

### ISSUE-XXX — Title

**Severity:** Low | Medium | High | Critical  
**Status:** Open | Investigating | Planned | Resolved

**Description:**  
**Impact:**  
**Affected feature:**  
**Workaround:**  
**Planned fix:**  
**Resolved date:**
