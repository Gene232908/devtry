# WhatsApp OTP Production Setup Runbook

This is the beginner-friendly, resumable guide for moving CarVibeDubai from
Meta's WhatsApp test number to a real WhatsApp Business Platform sender.

## Trigger command

Send this as a standalone message in a future AI session:

```text
NABIGAY NA NI SIR NYASH ANG WHATSAPP BUSINESS NUMBER
```

When this command is received, the AI must read this whole file before giving
instructions or changing configuration. It must guide the user one checkpoint
at a time, wait for the result of the current checkpoint, and then continue. It
must not dump all Meta steps on a non-technical user and leave them to guess.

This command starts the guided workflow. It is not automatic authorization to
register or migrate a phone number, add a payment method, expose a secret,
deploy, or send a real customer message. Those actions still require a clear
confirmation at the relevant checkpoint.

## What the future AI must do first

1. Read `AGENTS.md`, the normal daily startup files, this file,
   `SECURITY_COMPLIANCE.md`, `RELEASE_OPERATIONS.md`, and `KNOWN_ISSUES.md`.
2. Inspect the current OTP code and environment template; do not assume this
   document still matches the implementation.
3. Check current official Meta documentation because Meta changes its UI,
   eligibility rules, pricing, supported Graph API versions, and template
   requirements.
4. State the current checkpoint and ask only the question needed to complete
   that checkpoint.
5. Keep a session checklist with `not started`, `waiting`, `verified`, or
   `blocked` for every phase below.
6. Explain each Meta screen in plain Taglish and ask for a redacted screenshot
   when visual confirmation would prevent a mistake.
7. Never claim the setup is production-ready until every item in the final
   acceptance checklist has been verified.

## Never ask the user to paste these into chat

- Full debit or credit card number, CVV, expiry date, or bank OTP.
- Meta access token.
- Supabase service-role key.
- `OTP_HASH_SECRET` or any other signing/encryption secret.
- Login password, recovery code, session cookie, or authenticator seed.
- The SMS/voice verification code used to register the business number.

The user must type payment and verification details directly into Meta. Secret
environment values must be entered directly in Vercel or the authorized secret
store. Screenshots must hide tokens, card details, IDs that are not needed for
troubleshooting, and personal information.

The following non-secret identifiers may be shared when needed: Meta App ID,
Business Portfolio ID, WABA ID, Phone Number ID, template name, template status,
and template language code. The actual business phone number should only be
repeated when necessary and should not be written into logs or documentation.

## Current CarVibe implementation that must be rechecked

At the time this runbook was written:

- The valuation form uses Meta WhatsApp Cloud API, not Twilio Verify.
- `app/api/otp/send/route.ts` creates a random six-digit code, stores only its
  HMAC hash in Supabase, applies resend/abuse guards, and calls Meta server-side.
- `app/api/otp/verify/route.ts` validates the code, five-minute expiry, and
  attempt limit, then issues a short-lived proof required by lead submission.
- `lib/whatsapp/send-otp.ts` uses a temporary free-form/sample-template path in
  test mode and an approved Authentication template in production.
- `lib/whatsapp/phone.ts` and the valuation schema temporarily accept
  Philippine-shaped test numbers. Production is intended for UAE mobile
  numbers only; the temporary PH allowance must be removed during cutover.
- `WHATSAPP_WABA_ID` and `OTP_PRODUCTION_COUNTRY` are documented identifiers,
  but the current runtime send path does not read them. Do not treat either as
  proof that production routing is configured.
- `config/brand.ts` separately controls the public WhatsApp and call links. A
  production sender number does not automatically change those public contact
  links; Sir Nyash must decide whether they should use the same number.

Do not restore the legacy Twilio path unless Sir Nyash explicitly changes the
provider decision.

## Phase 0 — Collect authority and prerequisites without changing anything

Ask for these items one at a time. Record only status, never secrets.

- [ ] Sir Nyash has explicitly approved use of the number as the CarVibe OTP
      sender.
- [ ] Sir Nyash has approved real WhatsApp messaging charges and named the
      person responsible for billing.
- [ ] The exact number and country code are known.
- [ ] A trusted person can receive an SMS or voice call on that number during
      registration.
- [ ] The current state of the number is known:
      - new and not registered on WhatsApp;
      - active in WhatsApp Messenger;
      - active in WhatsApp Business App;
      - already registered in a WABA or with another provider/BSP.
- [ ] It is known whether existing chats, contacts, history, and continued use
      of the WhatsApp Business App must be preserved.
- [ ] The correct Meta Business Portfolio owner/admin is available.
- [ ] The correct existing Meta Developer App and WABA have been identified;
      no duplicate App, Portfolio, or WABA should be created casually.
- [ ] Legal business name, address, website/domain, business email, trade
      licence/registration documents, and any tax/billing details Meta requests
      are available to the authorized owner.
- [ ] A supported business payment method and its authorized cardholder are
      available for direct entry into Meta.
- [ ] At least two trusted human business admins have secure access, and their
      Meta accounts use two-factor authentication.

### Stop condition: existing WhatsApp use

If the number is already used in WhatsApp Messenger, WhatsApp Business App, a
WABA, or another provider, stop before registration. The future AI must verify
Meta's current migration/coexistence options for that exact setup. Do not tell
the user to delete the WhatsApp account, disconnect a provider, or sacrifice
chat history without:

1. a verified migration or coexistence plan;
2. a backup/export plan where supported;
3. an agreed downtime window;
4. explicit confirmation from Sir Nyash immediately before the destructive or
   service-interrupting step.

Meta's older direct Cloud API instructions said a number already registered in
Messenger or the Business App had to be removed first. Current coexistence and
migration availability can differ by account and onboarding route, so it must
be checked live rather than assumed.

## Phase 1 — Verify the Meta business foundation

The future AI should guide the user through the existing Meta Business Suite
and Developer dashboard, confirming each screen before continuing.

- [ ] Select the correct Business Portfolio in Meta Business Suite.
- [ ] Confirm business name, address, website/domain, email, and phone match the
      real business documents exactly.
- [ ] Complete any Business Verification requested by Meta. The AI may explain
      the form, but the business owner must provide and submit the documents.
- [ ] Confirm the existing CarVibe Meta Developer App belongs to that Portfolio.
- [ ] Confirm the WhatsApp product is attached to that App.
- [ ] Identify the correct WABA and record its non-secret WABA ID.
- [ ] Resolve any Account Quality, restriction, security, or verification alert
      before adding production credentials.

Meta approval is controlled by Meta. The AI must not promise approval timing or
claim that a submitted business/display name/template is approved until the
dashboard shows the approved/connected state.

## Phase 2 — Register or migrate the business phone number

Only begin after Phase 0 decides whether this is a new registration, migration,
or supported coexistence flow.

For a straightforward new number, Meta's documented route is generally:

1. Open `developers.facebook.com` and select the verified CarVibe App.
2. Open **WhatsApp → API Setup** (Meta may rename this screen).
3. Choose **Add phone number**.
4. Enter the approved business display name. Confirm capitalization with Sir
   Nyash before submitting because display-name review is separate from code.
5. Choose the real business timezone. For a UAE/Dubai operation this will
   normally be the Dubai/UAE timezone, but confirm it on the screen.
6. Choose the truthful business category and description.
7. Enter the business phone number with the correct country code.
8. Choose SMS or voice verification based on what the number can receive.
9. Sir Nyash or the authorized holder enters the verification code directly in
   Meta. The code must never be pasted into AI chat.
10. Confirm the number appears in the sender/**From** selector and its status is
    connected/registered, not pending or restricted.
11. Record the non-secret **Phone Number ID**. Do not confuse this numeric ID
    with the visible phone number.

If display-name or number review is pending, mark this phase `waiting` and stop.
Do not work around Meta's review with the test sender.

## Phase 3 — Add and verify billing on the correct WABA

This phase changes billing state. Ask for explicit confirmation immediately
before the user adds the payment method.

1. Open the correct Meta Business Portfolio.
2. Use either current UI route:
   - **Business Settings → Accounts → WhatsApp Accounts → select the correct
     WABA → Settings → Payment Settings**, or
   - **Billing & payments → Payment methods → WhatsApp Business Accounts**.
3. Confirm the selected WABA ID is the same WABA used by the production phone.
4. Review country, timezone, billing currency, legal business information, and
   tax fields with Sir Nyash/accounting. Do not guess: some billing choices may
   be difficult or impossible to change later.
5. Click **Add payment method** only after the owner confirms the correct WABA.
6. The cardholder privately enters the supported card/payment details and any
   bank verification code. The AI must never type, receive, or store them.
7. If Meta offers it, set the intended payment method as default for that WABA.
8. Confirm Meta shows an active/default payment method attached to the correct
   WhatsApp Business Account—not merely to an ad account or Meta Pay profile.
9. Confirm invoice/business details and where Sir Nyash will review charges and
   failed payments.
10. Record only `billing active: yes/no`, currency, and the card's last four
    digits if the owner wants a non-secret operational record. Never record the
    full card data.

Before launch, the future AI must open Meta's current Authentication rate card,
calculate the maximum expected daily cost from CarVibe's OTP cap, and obtain Sir
Nyash's written approval for that cap. A Meta billing threshold is not the same
as a hard spending limit.

## Phase 4 — Create the real Authentication OTP template

Do not use the Meta sample **Order Confirmation** template in production.

1. Open the correct WABA in WhatsApp Manager.
2. Open **Message templates** and choose **Create template**.
3. Select the **Authentication** category.
4. Use a stable lowercase name, for example `carvibe_otp`. Confirm the final
   name before it is referenced by code.
5. Choose the required language(s). Record the exact language code Meta
   approves, such as `en` or `en_US`; the display label is not enough.
6. Enable Meta's security recommendation if offered.
7. Set the displayed code-expiration time to match CarVibe's server expiry,
   currently five minutes.
8. Include the required OTP **Copy Code** button. The current production API
   payload sends one body code parameter and one `copy_code` button parameter;
   the template must match that shape.
9. Submit it and wait until the exact template/language status is **Approved**.
10. Perform a payload compatibility review against
    `lib/whatsapp/send-otp.ts` before any real send. If Meta's current API shape
    has changed, update code and tests first.

Do not rename an environment variable to the template's display title. Use the
exact template API name and exact approved language code.

## Phase 5 — Create a production system-user access token

The temporary token from the API Setup test panel is not a production secret.
It expires and must not be used for the live site.

1. Open **Business Settings → Users → System Users** in the correct Portfolio.
2. Create or reuse a dedicated CarVibe production system user. Do not use a
   developer's personal token.
3. Assign only the correct CarVibe App and WABA assets.
4. Grant the least privileges required. Runtime sending needs
   `whatsapp_business_messaging`; management tasks may require
   `whatsapp_business_management`. Do not grant unrelated business permissions
   without a documented reason.
5. Generate a token with the longest appropriate lifetime Meta currently
   supports for this first-party business setup.
6. Copy it once directly into the authorized secret store. Never put it in
   chat, a screenshot, `.env.example`, source code, Git, notes, or a ticket.
7. Use Meta's Access Token Debugger to verify token type, expiry, App, and
   permissions without exposing the token to the AI.
8. Document the owner, creation date, intended rotation/revocation process, and
   recovery contact without recording the token itself.

## Phase 6 — Configure CarVibe production secrets

The future AI must first compare this list to the actual code and
`.env.example`. Add values in **Vercel → CarVibe project → Settings →
Environment Variables**, scoped to **Production** unless a separately protected
staging environment has intentionally been approved.

Required WhatsApp/OTP values at the time of writing:

```text
WHATSAPP_ACCESS_TOKEN=<secret system-user token>
WHATSAPP_PHONE_NUMBER_ID=<numeric production Phone Number ID>
WHATSAPP_WABA_ID=<numeric production WABA ID>
WHATSAPP_API_VERSION=<supported version verified at cutover>
WHATSAPP_TEMPLATE_NAME=<exact approved Authentication template API name>
WHATSAPP_TEMPLATE_LANGUAGE=<exact approved language code>
WHATSAPP_TEST_MODE=false
WHATSAPP_TEST_RECIPIENTS=
OTP_HASH_SECRET=<unique cryptographically random production secret>
DEV_OTP_BYPASS=false
OTP_PRODUCTION_COUNTRY=AE
WHATSAPP_OTP_SENDING_ENABLED=true
```

Also confirm the existing server-only Supabase variables are present. Never
prefix a WhatsApp token, service-role key, or OTP secret with `NEXT_PUBLIC_`.

Set explicit OTP spend/abuse caps after checking the current defaults and Sir
Nyash's approved budget:

```text
OTP_GLOBAL_DAILY_CAP=<approved maximum sends in a rolling 24 hours>
OTP_PHONE_DAILY_CAP=<approved per-number cap>
OTP_IP_DAILY_CAP=<approved per-IP cap>
OTP_UNVERIFIED_STREAK_CAP=<approved unverified-number cap>
```

Current code defaults are 300 global, 5 per phone, 10 per IP, and 3 unverified
sends per rolling 24 hours. These are safeguards, not a guarantee of a precise
Meta bill. The future AI must calculate a conservative launch cap from current
rates and expected traffic rather than silently accepting the defaults.

Generate `OTP_HASH_SECRET` locally using a cryptographically secure generator;
show the command but do not print its result into chat. Changing this secret
invalidates outstanding OTPs and proofs, so rotation requires a planned window.

After editing Vercel values, create a new deployment. Environment changes do
not update an already-running deployment by themselves.

## Phase 7 — Required code and database cutover audit

Before enabling real customer sends, the future AI must inspect and, with user
approval, make the smallest safe production patch needed to:

- [ ] Remove temporary Philippine number acceptance from
      `lib/whatsapp/phone.ts`, the valuation schema, and related tests.
- [ ] Ensure production accepts and normalizes only the approved UAE mobile
      formats and validates them again on the server.
- [ ] Remove or quarantine temporary sample-template configuration.
- [ ] Confirm the Authentication template payload exactly matches Meta's
      current required request shape.
- [ ] Confirm `DEV_OTP_BYPASS` cannot run in production and is false/absent in
      the Production environment.
- [ ] Verify the emergency server-side OTP sending kill switch is enabled.
      Set `WHATSAPP_OTP_SENDING_ENABLED=false` only during an incident, then
      redeploy so no request can write an OTP record or call Meta. Restore it
      to `true` only after the cause is resolved and an approved canary passes.
- [ ] Verify rate limits, persistent daily caps, resend cooldown, expiry, wrong
      attempt limit, blocklist behavior, and safe generic error messages.
- [ ] Verify `whatsapp_otp_verifications`, `otp_attempts`, `blocked_numbers`, and
      required lead migrations exist in the real Supabase project with RLS.
- [ ] Schedule or document execution of the existing expired-OTP cleanup and
      confirm the retention period with the privacy owner.
- [ ] Decide whether the production sender should also replace
      `brand.whatsappNumber` and/or `brand.callNumber`; do not assume they are
      the same business function.
- [ ] Run secret scanning and confirm no real token, card data, or customer
      number was committed.
- [ ] Update tests for all changed behavior.

The current project does not use a WhatsApp delivery-status webhook for the OTP
flow. Before launch, explicitly decide whether accepted-vs-delivered monitoring
and billing/quality alerts are required. Do not report an API `200/accepted`
response as proof that the user received the WhatsApp message.

## Phase 8 — Verification before public activation

Run non-message checks first:

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build:check` (use this instead of a normal build if `next dev` may be
  running)
- secret scan and production environment-variable name review
- Supabase schema/RLS inspection
- Meta number, template, token, and billing status inspection

Then request explicit approval for a controlled real-message canary. Use a
consenting team-owned UAE WhatsApp number, not a random customer.

Canary checklist:

1. Submit the valuation form once with the authorized test recipient.
2. Confirm the message comes from the intended CarVibe production sender.
3. Confirm the approved Authentication copy, six-digit code, Copy Code button,
   and five-minute expiry text are correct.
4. Enter one wrong code and confirm no lead is created.
5. Enter the correct code and confirm exactly one verified lead is created.
6. Confirm the lead phone is stored in normalized UAE E.164 form and appears in
   the admin dashboard.
7. Confirm the OTP row never stores the plain code and becomes used after lead
   submission.
8. Test the 60-second resend cooldown and the agreed send limits without
   intentionally generating excessive paid messages.
9. Confirm Meta shows the message/billing event on the correct WABA and no
   payment or quality warning appeared.
10. Test the emergency kill switch and then restore it to the approved state.
11. Review server logs to ensure tokens, OTP codes, full phone numbers, and
    sensitive request bodies were not logged.

Do not test against an unknown or random phone number. The recipient must know
and consent to the test.

## Phase 9 — Final production activation and monitoring

Immediately before activation, summarize to the user:

- what external Meta state will become active;
- which Vercel deployment will receive production traffic;
- the approved daily OTP cap and estimated maximum cost using current rates;
- how to disable OTP sending immediately;
- how to roll back the deployment/configuration;
- remaining privacy, legal, delivery-monitoring, or account-review risks.

Obtain explicit approval, then activate only the agreed production deployment.
After activation:

- Monitor the first real sends, failures, Meta Account Quality, template
  quality, payment status, and daily cap.
- Alert Sir Nyash when usage or spend approaches the agreed threshold.
- Review failed-payment and token-expiry/revocation procedures.
- Record the non-secret release state in `WORK_LOG.md`, `CHANGELOG.md`,
  `SECURITY_COMPLIANCE.md`, `RELEASE_OPERATIONS.md`, `TASKS.md`, and
  `HANDOFF.md` only where those files are actually affected.
- Never call the whole product legally compliant or production-ready while the
  formal UAE privacy/compliance review and lead retention/deletion policy
  remain unresolved.

## Emergency stop and rollback

If unexpected charges, abuse, wrong recipients, an exposed token, or incorrect
template content appear:

1. Disable the server-side OTP sending kill switch immediately. Set
   `WHATSAPP_OTP_SENDING_ENABLED=false` in the Production environment and
   create a new deployment. This stops the route before any database write or
   Meta API call; it does not expose or delete existing credentials.
2. Do not switch `WHATSAPP_TEST_MODE=true` while keeping production sender
   credentials; test mode changes message behavior and is not a safe rollback.
3. If a token may be exposed, revoke it in Meta and create a replacement using
   the same least-privilege process.
4. Roll back to the last verified deployment/configuration as appropriate.
5. Preserve non-sensitive error IDs and timestamps for investigation; do not
   copy tokens, full phone numbers, or OTPs into logs/tickets.
6. Check the WABA billing/payment activity and Account Quality screens.
7. Resume only after a controlled canary passes again and the owner explicitly
   approves reactivation.

## Definition of complete for WhatsApp OTP production

The OTP production setup is complete only when all are true:

- [ ] Correct owned Business Portfolio, App, WABA, and production number.
- [ ] Existing-number migration/coexistence handled without unapproved data
      loss or downtime.
- [ ] Number connected and display name accepted.
- [ ] Billing active on the correct WABA and spending cap approved.
- [ ] Authentication template and language approved and payload-compatible.
- [ ] Least-privilege production system-user token verified and stored only as
      a server secret.
- [ ] Correct Production environment values deployed; all bypass/test values
      removed or disabled.
- [ ] UAE-only validation, emergency kill switch, rate limits, blocklist,
      cleanup/retention, and database/RLS checks verified.
- [ ] Lint, type-check, tests, build check, secret scan, and controlled real
      canary passed.
- [ ] Monitoring, payment-failure response, token recovery, and rollback owner
      documented.
- [ ] Sir Nyash gave final activation approval.
- [ ] Remaining UAE legal/privacy review is reported honestly.

## Starting progress table for the guided session

| Phase | Status | Evidence needed |
|---|---|---|
| 0. Authority and prerequisites | Not started | Owner confirmations; number state |
| 1. Meta business foundation | Not started | Correct Portfolio/App/WABA; no restriction |
| 2. Number registration/migration | Not started | Connected number and Phone Number ID |
| 3. Billing | Not started | Active/default method on correct WABA |
| 4. Authentication template | Not started | Approved name and language code |
| 5. System-user token | Not started | Token debugger result, never token value |
| 6. Production secrets | Not started | Variable names/scopes, values hidden |
| 7. Code/database audit | Not started | Diff, tests, schema/RLS checks |
| 8. Controlled canary | Not started | End-to-end verified lead and billing event |
| 9. Activation/monitoring | Not started | Final approval and rollback owner |

## Official references to recheck at execution time

- Meta Cloud API: <https://developers.facebook.com/docs/whatsapp/cloud-api/>
- Meta phone-number onboarding: <https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/add-a-phone-number>
- Meta's official WhatsApp Business Platform Postman workspace:
  <https://www.postman.com/meta/whatsapp-business-platform/overview>
- Meta Authentication template example:
  <https://www.postman.com/meta/whatsapp-business-platform/request/jrjfvav/create-authentication-template-w-otp-one-tap-autofill-button>
- Meta WhatsApp pricing: <https://developers.facebook.com/docs/whatsapp/pricing>
- Meta Business Settings: <https://business.facebook.com/settings>
- Meta Access Token Debugger: <https://developers.facebook.com/tools/debug/accesstoken/>

These links are starting points, not permission to rely on stale instructions.
The future AI must verify the current official pages and the actual dashboard
state before any production action.
