# KNOWN_ISSUES.md

Record unresolved bugs, risks, and technical debt.

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

## ISSUE-003 — Admin leads list has no pagination

**Severity:** Low (pre-existing, inherited from the restored backend)  
**Status:** Open

`GET /api/admin/leads` fetches every row with no `limit`/pagination. Fine at
current lead volume; revisit before lead count grows large (see
`RULES.md` performance rule: avoid unbounded data loading).

## ISSUE-004 — No documented data retention/deletion policy

**Severity:** Medium (UAE privacy compliance gap)  
**Status:** Open

The `leads` table stores personal data (name, phone, email, car details)
with no retention period or deletion process defined yet. `SECURITY_COMPLIANCE.md`
requires this documented before production; still needs client/legal input
on how long lead data should be kept and how deletion requests are handled.

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
