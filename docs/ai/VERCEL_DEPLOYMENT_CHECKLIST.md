# CarVibe Vercel Deployment Checklist

Use this checklist before each production deployment. It adapts the base
checklist from [PinoyFreeCoder/deployment-checklist](https://github.com/PinoyFreeCoder/deployment-checklist)
to this Next.js + Supabase + Vercel project. It is intentionally web-only.

## Release gate

- [ ] Branch has committed product changes only; local tooling output such as `tmp/` is ignored.
- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build:check` succeed.
- [ ] A Vercel Preview deployment is checked for the public valuation form, admin sign-in, lead update, inventory sale, commission receipt download, and developer payment flow.
- [ ] Production rollback is known: redeploy the previous successful Vercel deployment from the Deployments page.

## Vercel configuration

- [ ] Production has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` with the correct values.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, WhatsApp credentials, and SMTP credentials use Vercel **Secret** visibility. Never prefix a secret with `NEXT_PUBLIC_`.
- [ ] `NEXT_PUBLIC_META_PIXEL_ID` uses Vercel **Config** visibility and contains only the Meta Pixel ID.
- [ ] While WhatsApp OTP is paused, Vercel **Config** values are `PUBLIC_LEAD_VERIFICATION_MODE=unverified` and `WHATSAPP_OTP_SENDING_ENABLED=false`.
- [ ] When OTP is re-enabled, follow `docs/ai/WHATSAPP_OTP_PRODUCTION_SETUP.md`; do not enable it by changing only one of the two values.
- [ ] Vercel is assigned to region `hnd1`, and the configured daily photo-retention cron is visible in the deployment settings.

## Security and data

- [ ] Supabase migrations required by this release are applied in the intended project and verified with one non-production test record before live traffic.
- [ ] Supabase Auth and RLS policies are verified for Super Admin, Call Centre, and Purchaser roles. Check that a purchaser cannot read or edit another purchaser's leads.
- [ ] No `.env*.local`, token, password, service key, or customer export is committed. Scan both the current tree and relevant Git history.
- [ ] Live custom domain uses HTTPS. Confirm Vercel delivers the configured CSP, HSTS, frame protection, and noindex headers for `/admin` and `/api`.
- [ ] Meta Pixel Test Events receives a PageView after deployment. Do not enable Advanced Matching or send lead/contact data without explicit privacy review.
- [ ] The privacy policy, retention procedure, backup/restore owner, and incident contact have been confirmed by the business before public launch.

## Scale and operational checks

- [ ] Watch Vercel and Supabase logs after deployment for failed routes, cron failures, and mail/WhatsApp provider errors. Logs must not contain customer data or secrets.
- [ ] Verify the Leads Directory has not reached its current 1,000-row safety cap. Before it does, implement server-side pagination as tracked in `docs/ai/KNOWN_ISSUES.md`.
- [ ] Verify staff, inventory, payment, and commission screens with representative data; totals, status changes, receipts, and PDFs must agree.
- [ ] Confirm a backup exists and that a restore procedure has been tested by the database owner.

## Sign-off

| Field | Value |
| --- | --- |
| Release / commit | |
| Date and UAE time | |
| Checked by | |
| Vercel preview URL | |
| Open non-blocking risks and owner | |
| Go / no-go | |

An unchecked blocker is a **no-go**. This checklist supports, but does not replace, an external security, privacy, legal, or load-testing review.
