# SECURITY_COMPLIANCE.md

## 2026-10-01 incomplete-form retention boundary

- Unverified, unconverted incomplete forms are hidden after 30 inactive days and permanently deleted after 90 inactive days. The job cannot select converted rows and has no SQL delete path to confirmed leads or operational/financial tables.
- Cleanup runs through a `CRON_SECRET`-protected server route and a `service_role`-only database function. Work is capped at five 1,000-row batches per daily invocation to avoid an unbounded serverless task.
- Retention audit rows contain only cutoffs and aggregate counts; no customer name, phone, vehicle details, or IP hash is copied into the audit ledger.
- This operational rule covers abandoned incomplete forms only. Broader lead-personal-data retention and deletion requests still require client/legal approval before production.


## 2026-09-28 Meta Pixel boundary

- The browser loads Meta Pixel only when `NEXT_PUBLIC_META_PIXEL_ID` is
  configured. The public Pixel ID is not a secret; Meta access tokens and
  Conversions API credentials remain server-only.
- The initial integration sends only `PageView`. It does not send names, phone
  numbers, email addresses, lead notes, or form values. Automatic Advanced
  Matching remains disabled until consent and privacy handling are approved.

Read this for authentication, authorization, database, API, upload, personal-data, or security-related work.

## Secure coding

- Validate all untrusted input.
- Never concatenate user input into SQL.
- Use typed Supabase queries, parameterized SQL, or typed RPC arguments.
- Allowlist dynamic sort fields and identifiers.
- Do not render unsanitized HTML.
- Do not execute user-controlled shell commands.
- Do not fetch unrestricted user-provided URLs from the server.
- Return safe user-facing errors.
- Keep secrets server-side.
- Never expose Supabase service-role keys to the browser.

## 2026-09-10 Lead-view audit

- `POST` and `GET /api/admin/leads/[id]/events` require an active staff
  identity and enforce the same lead-visibility rule as the rest of the CRM.
- A lead view stores the authenticated actor plus a name/role snapshot. Views
  are deduplicated per staff member for 30 minutes, not across every viewer.
- The Activity timeline is shared only with staff permitted to view that lead;
  Super Admin can see every recorded agent and purchaser view.
- Saving a follow-up note or status change stores the authenticated actor and
  role snapshot server-side. The browser cannot choose who receives credit in
  the history.

## 2026-09-11 Assigned-team notes

- Call Centre staff and Purchasers can read the shared follow-up Notes field
  only on leads assigned to them. This is required for a safe handoff: the next
  person can see the last call outcome and agreed action.
- Lead row scoping remains enforced server-side before notes reach the browser.

## 2026-09-13 arrival and inspection-report boundary

- Only the assigned Call Centre user can confirm arrival, and only after a
  scheduled inspection has an assigned Purchaser.
- Purchasers receive the customer name needed to identify their assigned
  inspection, but not the customer's phone or email through their projection.
- Inspection routes re-check staff identity, assignment, and stage on every
  request. Photos are JPG/PNG only, max 8 MB, stored privately, and are served
  through an authorized same-origin route after an access check; storage URLs
  are never exposed to the browser.
- The completion RPC is service-role-only and updates report, lead state, and
  audit event in one transaction.
- The completion route verifies the resulting lead stage and only applies a
  guarded `Inspection Scheduled` to `Inspected` reconciliation after the
  validated completion RPC; it does not accept a browser-selected status.
- A completed-report reconciliation route is idempotent and server-derived:
  it can change only a matching `Inspection Scheduled` lead with an already
  completed inspection report. Draft reports and later workflow stages remain
  untouched.
- Inspection card saves and photo metadata/audit events use service-role-only
  RPCs after server-side assignment checks. Photo notes are validated by the
  API and database.
- A `CRON_SECRET`-protected Vercel job removes private inspection photos 60
  days after sale while keeping report information and activity history.
  Operational staff do not receive unassigned or another staff member's lead.
- Notes are operational working notes, not a channel for exporting customer or
  financial data across leads. Final retention and staff-use policy still needs
  client/legal approval before production.

## 2026-09-27 rescheduled inspection arrival boundary

- A confirmed arrival belongs to its saved appointment. When that appointment is
  rescheduled, server-side code clears `arrival_status`, `arrived_at`, and
  `arrived_by`, then records a separate Activity event. The shared workflow
  covers both Regular and Scrap leads; a browser cannot bypass it.
- An unchanged appointment, first scheduling, or notes-only save never clears an
  arrival. Inspection write access remains locked until Call Centre confirms the
  customer has arrived for the replacement appointment.

## 2026-09-11 Lead email notifications

- Gmail SMTP credentials are server-only environment variables. They are never
  returned by Settings, client JavaScript, API responses, or logs.
- Each new lead reads the saved `settings.notify_email` recipient at send time.
  Only an owner can change it through the Settings API.
- Email delivery failure cannot discard a submitted lead. The lead is stored
  first, then a safe server-side error is logged for a failed notification.
- New-lead emails contain customer information, so the saved recipient must be
  a designated business operator. Retention and access policy need approval
  before production use.

## Authorization

- The browser is untrusted.
- Hidden buttons are not security.
- Enforce access through trusted server logic or Supabase RLS.
- Deny by default.
- Prevent self-promotion to privileged roles.
- Test cross-user, cross-role, and cross-branch access.

## 2026-09-09 Executive Overview

- The executive Overview and `/api/admin/overview` require an active `admin` or
  owner-level `manager` profile through `requireAdmin()`.
- Financial, inventory exposure, and staff commission data are intentionally
  unavailable to operational staff.
- Demo records remain included for the current local/demo phase at the client's
  direction and must be excluded before production reporting is relied upon.

## Authentication and abuse protection

- Use an approved identity provider such as Supabase Auth.
- Rate-limit sign-in, recovery, public forms, uploads, and expensive endpoints.
- Protect privileged accounts with MFA when approved.
- Revoke disabled-user sessions.
- Avoid account-enumeration messages.

## File uploads

- Limit size and count.
- Allowlist file types.
- Generate safe file names.
- Use private storage for identity, contract, or payment documents.
- Use short-lived signed URLs.
- Never use real documents in development or demos.

## Logs

Do not log:

- Passwords.
- Tokens.
- Cookies.
- Secret keys.
- Full identity documents.
- Full payment details.
- Sensitive request bodies.

## UAE privacy baseline

Before collecting personal data, document:

- Purpose.
- Required fields.
- Who can access it.
- Retention period.
- Deletion method.
- Vendor or hosting location.
- User notice or consent requirement.

The project still requires qualified UAE legal/compliance review before production.

## 2026-09-04 WhatsApp OTP emergency stop

## 2026-09-27 temporary public OTP pause

- The server-owned `PUBLIC_LEAD_VERIFICATION_MODE` defaults to `unverified` in the local code; it affects only public valuation and Scrap Inquiry submissions. OTP send/verify endpoints reject new requests in that mode.
- Direct lead submissions are validated server-side, checked against blocked numbers and an open lead of the same inquiry type, and saved with `phone_verified=false`. The browser cannot assert verification or choose the server's mode. Existing verified records are untouched.
- A client-generated UUID is accepted only as the lead primary key for retry idempotency; the API compares the persisted submission before treating a repeat as success. The client-only demo-success path was removed.
- Per-phone/IP burst limiting currently uses the existing in-memory limiter, which is not shared across serverless instances. Do not describe this as a persistent abuse guarantee. Before deployment, assess edge or database-backed rate limits and conduct a staging end-to-end/mobile check. No production deployment was made by this task.

- `WHATSAPP_OTP_SENDING_ENABLED=false` is a server-only emergency circuit
  breaker for paid WhatsApp OTP sends. The send route stops before parsing the
  request, writing an OTP record, or calling Meta.
- The public form receives a safe temporary-unavailability message. It must not
  treat this intentional stop as an offline/demo fallback or client-side OTP
  verification bypass.
- The switch name and value may be reviewed, but access tokens, OTP secrets,
  customer numbers, and verification codes must never be copied into chat or
  documentation.

## 2026-07-02 public valuation form update

- The Milestone 1 UI now collects name and WhatsApp number first, following Sir Nyash's preference to capture contact details before the customer leaves.
- The WhatsApp number validator accepts common UAE mobile formats after removing spaces, dashes, and other separators: local `05...` and country-code `9715...` or `+9715...`.
- The form now also asks for inspection emirate/location because home inspection filtering is part of the client workflow.
- Consent text is shown in the first step before continuing through the form.
- The current implementation remains UI/mock only; real backend storage must normalize and validate phone numbers server-side, rate-limit OTP, protect lead data with trusted authorization/RLS, and document retention/deletion before production.

## Public repository rule

## Settings owner-only boundary — 2026-09-10

- Call Centre and Purchaser roles have no `viewSettings` capability. Settings
  is hidden from both navigation surfaces and direct page access redirects to
  Leads.
- The Settings page and GET API independently require an owner role because
  they read through service-role data access; hiding a link is not permission.

## Incomplete-form access boundary — 2026-09-10

- Incomplete forms contain unverified personal data. The detail/list routes
  enforce `viewIncompleteForms` server-side and scope Call Centre users to their
  assigned captures.
- Purchasers cannot view incomplete forms through the page, query helpers, or
  detail API. They receive access only after a CSR converts a verified capture
  to an inspection-scheduled real lead.
- Assignment selection and conversion use server-side service-role operations;
  public clients cannot provide either staff ID.
- The capture and follow-up database functions are explicitly executable only
  by `service_role` after migration 0026.

Never commit:

## 2026-09-14 manual lead boundary

- `POST /api/admin/leads/manual` requires a current active staff identity and
  the explicit `createLeads` capability for every role.
- Creator identity and role are derived server-side and cannot be supplied by
  the browser. Phone, source, vehicle details, and text lengths are validated
  before the service-role insert.
- Purchaser contact-data restrictions remain unchanged. A lead created by a
  Purchaser enters the existing Call Centre assignment flow rather than
  bypassing the inspection handoff.

## 2026-09-14 referral evidence boundary

- Referral proof accepts only JPG, PNG, or PDF files up to 8 MB and is stored
  in the private `referral-proofs` bucket; the browser receives no public URL.
- Proof metadata and bytes are read only through authenticated server routes
  after the existing lead-visibility check. The selected employee referrer is
  validated as an active profile on the server.
- Incentive creation and payout occur in database functions invoked only by
  server-side service-role routes. The client cannot select the payout amount
  or mark an incentive paid.
- Zero-value referral incentives are blocked at the database boundary, so a
  default or unset incentive amount cannot create a misleading payable row.

## 2026-09-23 inspection reschedule alerts

- The notification API derives the signed-in recipient on the server. It never
  accepts a recipient ID from the browser.
- Only Super Admin/Owner and Purchaser roles can receive or read the bell;
  Call Centre accounts receive no notification payload.
- Purchaser inventory responses redact Call Centre and Developer commission
  figures and assignment UUIDs before they reach the browser. Their inventory
  view contains only their own unpaid Purchaser ledger amount.
- Call Centre commission responses redact aggregate and per-sale profit before
  the payload reaches the browser. Their PDF invoice follows the same rule.

## 2026-09-24 Scrap inquiry integrity

- Public Scrap submissions use the same signed OTP proof as valuations; the
  browser never provides staff assignment or approval authority.
- The database rejects any later change from Scrap to valuation. An assigned
  Purchaser or Super Admin/Owner may record a Scrap Deal through the same
  server-side price validation and atomic Inventory transaction as a valuation.

## 2026-09-24 incomplete Scrap recovery integrity

- The public abandoned-form endpoint accepts only the fixed inquiry types,
  bounded text, a finite non-negative asking price, and a known capture event;
  it rate-limits by IP and never accepts an assignee or staff role from the
  browser.
- Incomplete Scrap records remain unverified personal data. Existing
  server-side `viewIncompleteForms` checks keep them limited to Super Admin
  and the owning Call Centre user; Purchasers cannot list or open them.
- OTP and duplicate checks are scoped to the immutable inquiry type, avoiding
  suppression of a genuine Scrap request by an unrelated valuation request.
- The OTP record carries the requested inquiry type, and lead creation rejects
  a proof from the other form type; a visitor cannot use a Scrap code to bypass
  an open valuation guard (or the reverse).

- Secrets.
- Real personal data.
- Database dumps.
- Production environment values.
- Identity documents.
- Unfixed exploit details.
