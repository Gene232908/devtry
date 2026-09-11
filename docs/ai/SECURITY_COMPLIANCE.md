# SECURITY_COMPLIANCE.md

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
  Operational staff do not receive unassigned or another staff member's lead.
- Notes are operational working notes, not a channel for exporting customer or
  financial data across leads. Final retention and staff-use policy still needs
  client/legal approval before production.

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

- Secrets.
- Real personal data.
- Database dumps.
- Production environment values.
- Identity documents.
- Unfixed exploit details.
