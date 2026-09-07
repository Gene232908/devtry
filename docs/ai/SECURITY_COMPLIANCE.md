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

## Authorization

- The browser is untrusted.
- Hidden buttons are not security.
- Enforce access through trusted server logic or Supabase RLS.
- Deny by default.
- Prevent self-promotion to privileged roles.
- Test cross-user, cross-role, and cross-branch access.

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

Never commit:

- Secrets.
- Real personal data.
- Database dumps.
- Production environment values.
- Identity documents.
- Unfixed exploit details.
