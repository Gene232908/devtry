# Temporary WhatsApp OTP pause — implementation and restoration plan

**Status:** Implemented in the local code on 27 September 2026; not deployed by this change. The server default is `unverified` for both public forms. Reading this file does not change a deployment.

## Decision and scope

In the [25 September 2026 meeting notes and transcript](https://docs.google.com/document/d/1lMmR5sbRm4Pg13JzqW0aEM44rqZ7ypw3xNYc4LM-dBE/edit?tab=t.9liq5kfxqw6m), Sir Nash explicitly asked to pause WhatsApp OTP for now to avoid using a private payment card, and restore it later when a company card/business setup is available. The transcript confirms this at approximately 01:46:39–01:47:48 and 01:54:46. This applies to **both** public Free Valuation (regular lead) and Scrap Inquiry forms. It does not authorize dropping verification data, weakening staff authentication, or marking unverified numbers as verified.

This document is the handoff for a future AI builder. The owner requested the implementation after the plan. Production deployment remains a separate step under `docs/ai/RELEASE_OPERATIONS.md`.

## Implemented switch and data contract

- `PUBLIC_LEAD_VERIFICATION_MODE` is server-only: unset or `unverified` pauses OTP; `otp` restores the proof-required flow. An unknown value throws rather than silently choosing a mode. The public layout passes the mode to the existing responsive valuation/scrap modal.
- In `unverified` mode, both OTP endpoints return 503 before parsing, writing, or sending. `WHATSAPP_OTP_SENDING_ENABLED` remains the separate emergency sender switch and does not by itself implement the form bypass.
- Both public forms submit directly to `/api/leads` without proof in pause mode. The server validates the fields, checks the blocklist and open-lead state, applies per-phone/per-IP burst limits, saves `phone_verified=false`, preserves inquiry type, CSR assignment, partial conversion, activity, and notification. No fake success is shown when persistence fails.
- The form's per-attempt UUID is inserted into the existing `leads.id` primary key for retry idempotency. The server compares all submitted customer/vehicle fields before acknowledging a retry. No new table/column or migration was needed; existing verified rows were not changed.
- The old client-only demo success path is removed. The UI displays the thank-you modal only after a successful API response with a lead ID.
- No production deployment, live lead submission, test lead insertion, or real WhatsApp send was performed as part of this work.

## Pre-change audit (historical; verify again before future edits)

| Area | Current behavior / risk |
| --- | --- |
| `components/public/valuation-form/use-valuation-form.ts` and `index.tsx` | Both form modes request OTP, show an OTP modal, then submit with a signed proof. A `null` proof currently triggers a **client-only demo success without saving a lead**. Never reuse that branch as the bypass. |
| `app/api/leads/route.ts` | Requires signed, phone- and inquiry-type-bound OTP proof; writes `phone_verified: true`; creates the lead, converts the matching partial lead, logs activity, and notifies staff. The proof also supplies retry idempotency. |
| `app/api/otp/send/route.ts`, `lib/server/otp-sending.ts` | `WHATSAPP_OTP_SENDING_ENABLED=false` only stops sending (503). By itself it leaves the form unable to submit. The send route currently carries important abuse checks that the final lead endpoint does not independently enforce. |
| `app/api/partial-lead/route.ts` | Captures incomplete forms by phone and inquiry type. Successful final submissions must continue marking the matching partial as converted. |
| Supabase | `leads.phone_verified` already supports `false`; OTP verification rows are separate. `leads.inquiry_type` distinguishes valuation and scrap. Keep all existing rows and migrations. |
| Staff UI | Inventory can display `Unverified number`; review other lead detail, form, and blocked-number copy so it never implies OTP verification when bypassed. |

## Original implementation plan and remaining hardening

1. Add **one server-owned public verification mode**, e.g. `PUBLIC_LEAD_VERIFICATION_MODE=otp|unverified`, defaulting to `otp` and rejecting invalid values. Expose only a safe mode boolean/string to the public form. The browser must not choose the server's mode by request body. Preserve `WHATSAPP_OTP_SENDING_ENABLED` as a separate emergency sender switch; in `unverified` deployments set it to `false` as well to prevent OTP costs. Keep non-public authentication unchanged.
2. In `otp` mode, preserve the existing verified flow. In `unverified` mode, hide OTP prompts and send the validated form directly to `/api/leads` for **both** `valuation` and `scrap`. Show success only after that API confirms a persisted lead ID. Remove/disable the no-proof client-only demo-success path from any real submission. If the database or API fails, show an error and allow a safe retry.
3. In `/api/leads`, branch **only on the server mode**. In `otp` mode, require valid proof as now and store `phone_verified: true`. In `unverified` mode, reject/ignore claimed proof and store `phone_verified: false`; do not create a fake OTP verification row. Keep shared server-side field, mileage/unit, scrap, consent, specification, and phone validation. Keep `source`, `inquiry_type`, CSR round-robin assignment, partial-lead conversion, activity, and staff notification behavior.
4. Move/replicate public-form protections to final submission: per-IP and per-phone rate limits, blocked-number checks, honeypot and abuse monitoring, plus the existing open-lead rule scoped by phone **and inquiry type**. Handle database errors conservatively (no fail-open submission). A client-supplied `startedAt` is not trustworthy security evidence. Since numbers are unverified, ensure the duplicate/open-lead policy does not silently erase legitimate customers' requests; choose and document a staff-review path for conflicts.
5. Done using the existing UUID lead primary key for same-submission retries; no migration. A concurrent request with the same ID sees the primary-key collision and reads the winning row before returning success. Independent simultaneous IDs for the same phone/type still need a transactional database uniqueness rule if this becomes a material issue.
6. Keep `phone_verified=false` visible to staff, and label it clearly as an **unverified customer-provided number**. Update OTP-specific public and blocked-number text. Do not retroactively change any historical `phone_verified` values. Preserve the existing incomplete-form and purchaser/CSR workflows.
7. In `unverified` mode, disable new OTP send/verify operations on the server rather than merely hiding the UI. Switching modes should not make old proof reusable. Document the deployment value and redeploy procedure; do not place Meta tokens or other secrets in this README.

## Data and rollback rules

- No destructive migration, no dropped `whatsapp_otp_verifications` table, no reset of OTP histories, and no changed meaning of `leads.phone_verified`.
- Prefer additive schema changes only. Before writing a migration, inspect the current migration head and active deployment schema; do not assume a migration number or that the DB has already been updated.
- Existing verified leads remain verified; leads accepted during the pause remain unverified even after OTP returns. A later staff confirmation must be explicit and auditable, not a mass update.
- If the pause is rolled back, set the server mode to `otp`, enable sending only after its provider is ready, and redeploy. Do not use an OTP-mode rollout with sending disabled unless intentionally placing submissions in maintenance.

## Verification performed and still required before release

Local checks on 27 September 2026: typecheck; focused API tests for both modes and inquiry types; full test suite; lint; production `build:check`; read-only Supabase checks for required tables/columns; local HTTP smoke checks (`/` 200, OTP send 503, malformed lead 400). No real-data lead was inserted. A visual mobile/browser test and staging end-to-end persisted submission were **not** completed, so they remain release gates.

- Add focused tests for both modes and **both** inquiry types. A direct forged POST without proof must fail in `otp` mode; a valid bypass submission must persist with `phone_verified=false`; a failed insert must never display success.
- Test blocked number, rate limit, honeypot, invalid fields, duplicate/open lead, and concurrent retry behavior. Verify one lead, one conversion, and one notification per submission.
- Test completed/incomplete form transitions and CSR assignment, including a race with partial capture. Check staff labels and blocked-number behavior.
- Test responsive form states on narrow mobile and desktop; confirm there is no hidden/stranded OTP step.
- Run focused tests, `npx tsc --noEmit`, lint for affected files, a production build when preparing release, and a staging end-to-end smoke test through the real database. Verify database row values and no WhatsApp send in bypass mode. Check logs for errors and unexpected volume after release.
- Record the deployed mode and date in the operational handoff. Do not claim completion based on lint alone.

The existing `lib/rate-limit.ts` is process-memory only; it does not provide a cross-instance/serverless guarantee. The blocklist and open-lead lookups are database-backed and fail closed in pause mode. If stronger abuse protection is needed before production, add a persistent limiter in a tracked, staged migration or at the deployment edge; do not mislabel OTP attempt rows as public-lead submissions.

## Later: restore WhatsApp OTP

When the owner explicitly requests re-enabling, the future AI should:

1. Read `AGENTS.md`, `RULES.md`, current architecture/security/database/release docs, **this README**, and the complete `docs/ai/WHATSAPP_OTP_PRODUCTION_SETUP.md`. Re-inspect current code and migration state; this plan may be stale.
2. Follow the production setup runbook checkpoint by checkpoint, rechecking current official Meta requirements. Obtain the business-approved number/payment arrangement and explicit confirmations at the required checkpoints. Never ask the user to paste OTPs, payment-card data, access tokens, or secrets into chat. Preserve existing WhatsApp accounts and chats.
3. In staging, prove the whole `otp` path for valuation and scrap: send → verify → proof-bound lead creation → retry/idempotency → partial conversion → staff visibility. Also prove an unsigned POST is rejected, wrong-phone/wrong-inquiry proofs fail, and old unverified leads remain unchanged.
4. Set the production mode to `otp` and `WHATSAPP_OTP_SENDING_ENABLED=true` only after provider readiness, deploy with a rollback plan, then run a supervised end-to-end submission. Monitor send failures, spend limits, lead counts, and conversion. Keep abuse protections active in both modes.
5. Update the relevant docs and operational record with actual changes/checks. Merely asking an AI to read this README does **not** automatically enable OTP or authorize production operations.

Suggested future request: “Read `docs/ai/OTP_TEMPORARY_BYPASS/README.md` and the referenced production runbook fully. Audit the current code and deployment, then implement/test the requested mode change [pause or restore] without altering historical verification flags. Ask me before provider/payment/production checkpoints.”
