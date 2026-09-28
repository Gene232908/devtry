# CarVibe Dubai — Website Build Blueprint

> A complete, implementation-ready specification for the **public valuation website** and the **private admin dashboard**, derived from Sir Nash's approved mockups.
> This is a *build* document, not a contract. If a developer or AI reads this, they should be able to build the product without guessing.

**Stack:** Next.js 14 (App Router, TS) · Tailwind · Supabase (Postgres + Auth + RLS + Realtime) · Twilio Verify (OTP) · Nodemailer/Gmail (alerts) · Recharts · React Hook Form + Zod.

---

## TABLE OF CONTENTS
1. What we are building (read from the mockups)
2. Sitemap & route map
3. Design system (exact tokens, gold glow, motion)
4. PUBLIC SITE — full section-by-section spec
5. The Valuation Form — complete state machine (the core feature)
6. ADMIN DASHBOARD — full screen-by-screen spec
7. Data model (every table, column, enum, index)
8. API / server actions (every endpoint contract)
9. State, data flow & realtime
10. Validation rules (every field)
11. Component architecture + 500-line file trees
12. Security architecture
13. SEO & performance
14. Accessibility & Arabic-readiness
15. Config & content (data-driven, client-editable)
16. **Founder operations & growth** (visitor & valuation tally, owner export, Gmail alert, CRM-lite)
17. **Advanced security hardening** (Cloudflare/WAF, 2FA, monitoring, backups)
18. Build task breakdown (ordered, checkboxed — "everything to do")
19. Pending inputs

---

## 1. What we are building (read from the mockups)

Three reference images define the product:

**Image A (tablet + phone + admin slice):** ornate **CVD** monogram, headline *"CARVIBEDUBAI / DUBAI'S LUXURY CAR VALUATION"*, a card with **STEP 1 / STEP 2 / STEP 3** tabs, **MAKE / MODEL / YEAR / MILEAGE** dropdowns, gold **"VALUATE MY CAR"** button, **"MESSAGE CVD"** WhatsApp pill. The phone shows an **open MODEL dropdown glowing gold**: *Range Rover SVR, ✓ Lamborghini Urus, G-Wagon G63, Bentley Bentayga, Ferrari 488*. The admin slice: **"CARVIBE DUBAI | ADMIN"**, sidebar **DASHBOARD/LEADS/ANALYTICS/WEBSITE/SETTINGS**, **SUMMARY & STATISTICS** cards (*Total Leads 1,482 · New Submissions Today 38 · Average Value AED 2.1M · WhatsApp Clicks 615*), a **LEADS DIRECTORY** chart + table (*Lead ID, Date, Name, Vehicle, Estimated Value, Status → "Follow Up Now"*).

**Image B (full admin):** topbar **"CarVibeDubai"** + 🔔 + logout + user menu. **Overview** with three cards — **Website Visitors 8,745** (This Week, line chart), **Car Submissions 312** (New Submissions, bar chart), **Total Leads 498** (Active Leads). Sidebar: **Dashboard / All Leads / Inventory / Users / Settings**. **Recent Leads** table — `# · Client Name · Mobile Number ⇅ · Car Details · Date ⇅ · Status`, with status pills **Pending** (amber dot), **Contacted** (gold dot), **Valuation Sent** (gold chip). Sample rows use UAE numbers (`+971 50 123 4567`) and cars (Toyota Land Cruiser, Mercedes E-Class, Nissan Patrol).

**Image C (full landing):** black page, top nav **CarVibeDubai** + **HOME / VALUATION / HOW IT WORKS / CONTACT**. One card holds all three steps stacked: **Step 1: Car Details** (Make=Rolls-Royce, Model=Phantom, Year=2023) · **Step 2: Vehicle Condition** (Excellent/Good/Fair radios) · **Step 3: Contact Info** (Name, WhatsApp Number) · gold **GET VALUATION** button. Right: a black **Rolls-Royce** against the Dubai skyline. Floating **"Chat on WhatsApp"** button.

### Reconciliation decisions (where mockups differ)
- **Form layout:** Use **Image C** as the canonical desktop layout — all three steps stacked on one premium card with the Rolls-Royce/skyline visual beside it. On mobile, collapse to a **stepped wizard** (Image A's STEP 1/2/3 tabs) so it stays thumb-friendly. One component, two responsive presentations.
- **Mileage:** Present in Image A, absent in Image C. **Include it** (required) — proposal lists it. Place it in Step 1 next to Year.
- **Condition:** Present in Image C, absent in Image A. **Include it** (required) — proposal v2 lists it. It is Step 2.
- **Stat cards:** Union of both admin variants, **config-driven**: Total Leads, New Submissions (Today), Active Leads, Website Visitors (This Week), Average Value (AED), WhatsApp Clicks. Show the 3–6 Sir Nash confirms.
- **Sidebar:** In-scope now → **Dashboard, Leads, Settings**. Built-but-disabled (feature-flagged) → **Analytics, Inventory, Users, Website**. They appear, greyed/"Coming soon", so the design matches the mockup without scope creep.
- **Estimated Value (AED):** Admin-only, manually editable per lead. **Never shown to the customer** (proposal: no price displayed). Powers the "Average Value" stat.

---

## 2. Sitemap & route map

```
PUBLIC (route group: (public), indexable)
  /                      Landing: hero + valuation form + how-it-works + contact
  /#valuation            anchor to form
  /#how-it-works         anchor
  /#contact              anchor
  /privacy               Privacy policy (UAE PDPL-friendly, simple)
  /terms                 Terms

ADMIN (route group: (admin), noindex, auth-gated)
  /admin/login           Email-OTP / magic link
  /admin                 Dashboard overview
  /admin/leads           Leads directory (table)
  /admin/leads/[id]      Lead detail
  /admin/settings        Settings
  /admin/analytics       (flagged: coming soon)
  /admin/inventory       (flagged: coming soon)
  /admin/users           (flagged: managers — basic add/remove)

API / server (app/api or server actions)
  POST /api/otp/send         start Twilio Verify
  POST /api/otp/verify       check code → returns short-lived verify token
  POST /api/leads            insert lead (requires verify token)
  POST /api/events           log whatsapp_click / page_view
  POST /api/notify           (internal) email admin on new lead
  PATCH /api/leads/[id]      admin: update status / estimated_value / notes
```

---

## 3. Design system (exact tokens)

### 3.1 Color (CSS variables → Tailwind)
```
--bg            #0A0A0A   page background (true luxury black)
--bg-elev       #111111   beneath cards
--surface       #161616   card / form panel
--surface-2     #1E1C19   raised rows, hover, inputs
--border        #2A2620   hairline (gold-tinted)
--border-gold   #4A3D1F   gold-tinted divider
--gold          #D4AF37   PRIMARY gold  (CONFIRM exact hex w/ Sir Nash)
--gold-soft     #C9A24B
--gold-hi       #F3DE8A   gradient highlight / glow
--gold-deep     #8C6D1F   gradient bottom for metallic buttons
--text          #F5F3EF
--text-muted    #A39C90
--text-faint    #6E675C
--success       #34C77B   WhatsApp / "Contacted"
--warning       #E0B341   "Pending" dot
--info          #5AA9E6   "Valuation Sent" alt
--danger        #E5484D   errors
```

### 3.2 Gold treatments (the signature look)
- **Metallic button fill:** `linear-gradient(180deg, var(--gold-hi), var(--gold) 45%, var(--gold-deep))` + subtle inner top highlight + 1px `--gold` border.
- **Glow (focused dropdown / active field):** `box-shadow: 0 0 0 1px var(--gold), 0 0 18px -2px rgba(212,175,55,.55)` — exactly the glowing open dropdown in Image A.
- **Gradient hairline borders** on cards: 1px border with a faint gold-to-transparent gradient.
- **Selected list item** (dropdown): left/full gold tint bg `rgba(212,175,55,.12)` + ✓ check + gold text.

### 3.3 Typography — premium, modern & fully fluid
**Pairing = a refined display serif + a clean modern sans. Goal: looks expensive and contemporary, scales on every screen.**
- **Display / headings / logo:** premium serif — primary **Playfair Display** (high-contrast luxury) or **Cormorant**; for a more *modern-luxury* edge, **Clash Display** (Fontshare, free). Tight tracking on big headings.
- **Body / UI / numbers:** modern geometric sans — **Inter** (default) or **Manrope / Geist / Satoshi**. **Tabular numerals** for stats & tables so columns align.
- Loaded via **`next/font`** (self-hosted, subset, preloaded, `display: swap`) → **zero layout shift (CLS), no font flash**, fast on mobile.
- **Single swap point:** fonts declared once in `app/fonts.ts` → CSS vars `--font-display` / `--font-sans`. Change the entire site's typeface by editing one file. Fully flexible.

**Fluid type scale (`clamp()`)** — text grows/shrinks smoothly between phone and desktop, never breaks layout, no manual breakpoint juggling:
```
--step--1: clamp(0.83rem, 0.79rem + 0.18vw, 0.94rem)   /* small / captions   */
--step-0:  clamp(1.00rem, 0.95rem + 0.24vw, 1.13rem)   /* base body          */
--step-1:  clamp(1.20rem, 1.11rem + 0.43vw, 1.50rem)   /* lead / lg          */
--step-2:  clamp(1.44rem, 1.30rem + 0.71vw, 2.00rem)   /* h3                 */
--step-3:  clamp(1.73rem, 1.50rem + 1.14vw, 2.66rem)   /* h2                 */
--step-4:  clamp(2.07rem, 1.73rem + 1.74vw, 3.55rem)   /* h1                 */
--step-5:  clamp(2.49rem, 1.97rem + 2.59vw, 4.73rem)   /* hero / display     */
```
Headings reference these vars (not fixed px), so a small phone and a 4K monitor both look balanced. Line-height and letter-spacing also scale by role. **Confirm final fonts against Sir Nash's Canva** (§19) — but these are the premium defaults.

### 3.4 Spacing, radius, shadow, motion
- Spacing scale 4px base (Tailwind default). Container max `1200px`, gutter 24px.
- Radius: inputs/cards `12px`, buttons `10px`, pills `9999px`.
- Shadow: cards `0 8px 30px -12px rgba(0,0,0,.6)`; gold glow per 3.2.
- Motion: 150–250ms ease-out; button shimmer on hover; dropdown open 180ms; respect `prefers-reduced-motion`.
- Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280`. **Mobile-first** (most UAE traffic is mobile).

### 3.5 Responsiveness & Definition of Done (no-error · complete · flexible)
Every screen is **mobile-first** and must pass these before it is "done." Enforced by **tooling (pre-commit hook + CI gate)**, not by promises — broken code cannot merge or deploy:
- **Fully responsive & flexible:** fluid type (§3.3) + fluid spacing (`clamp`) + responsive grids/flex. **No fixed-pixel layout widths, no horizontal scroll on any device,** tap targets ≥ 44px, images via `next/image` with responsive `sizes`. Fonts and spacing both scale — nothing hard-coded.
- **Device matrix (must pass):** small phone (360px), iPhone Safari, Android Chrome, tablet, laptop, 4K. The valuation form is reachable in one thumb-scroll on mobile.
- **Zero errors gate:** `tsc --noEmit` (strict) + **ESLint** + `next build` all pass with **no errors and no warnings**.
- **Complete:** happy path **plus** loading / empty / error states implemented — no stubs/TODOs shipped.
- **Tested + reviewed:** unit/e2e green on critical paths (form → OTP → lead; admin login → status); passes `/code-review` (and `/security-review` for auth/OTP/DB paths).
- *Honest:* no process is 100% bug-free forever, but these gates catch errors **before** they ship — clean for Sir Nash, painless for you to maintain.

---

## 4. PUBLIC SITE — section-by-section spec

### 4.1 Navbar (`public/header`)
- Left: **CVD monogram + "CarVibeDubai"** (serif). Right (desktop): **HOME · VALUATION · HOW IT WORKS · CONTACT**, gold underline animates under active. Sticky, translucent black with blur on scroll.
- Mobile: hamburger → slide-over menu, same links + a "Get Valuation" gold button.
- Smooth-scroll to anchors. Active-link tracking via IntersectionObserver.

### 4.2 Hero (`public/hero`)
- Full-bleed black with Dubai skyline + luxury car (Rolls-Royce) image (`next/image`, priority, AVIF/WebP).
- Headline **"DUBAI'S LUXURY CAR VALUATION"**, sub-line (PENDING copy), CTA scrolls to form.
- On desktop the hero and the form sit side-by-side (Image C); on mobile they stack (form first or hero-then-form — form must be reachable in one thumb scroll).

### 4.3 Valuation form (`public/valuation-form`) → see §5 (its own state machine).

### 4.4 How It Works (`public/how-it-works`)
- 4 steps with gold line-icons: **Valuation → Appointment → Inspection → Cash**. Each: icon, title, one-line copy. Animated count/connectors on scroll. Builds trust.

### 4.5 Contact (`public/contact`)
- Business contact block: WhatsApp, Call, hours, location (Dubai). Map optional (lazy, no heavy embed). All values from `config/brand.ts` / `settings`.

### 4.6 WhatsApp FAB (`public/whatsapp-fab`)
- Floating green button "Chat on WhatsApp", bottom-right, gentle pulse. Deep-link `https://wa.me/<number>?text=<prefill>`. **Every click logs a `whatsapp_click` event** (powers the admin stat). Hidden when a modal is open.

### 4.7 Footer (`public/footer`)
- Links, social, copyright, and the credit line **"Developed by CREServices Beyond Strategy FZE LLC"**.

### 4.8 Global public states
- Cookie/consent notice (PDPL-friendly, minimal). 404 page on-brand. Skeletons for image-heavy hero.

---

## 5. The Valuation Form — complete state machine

This is the heart of the product. Build it as a finite state machine so every path is explicit.

### 5.1 Fields (in order)
| Step | Field | Type | Source |
|---|---|---|---|
| 1 | Make | dropdown (searchable) | `config/vehicles` makes |
| 1 | Model | dropdown, **depends on Make** | models[make] |
| 1 | Year | dropdown | 1990 … currentYear+1 |
| 1 | Mileage (km) | number or bracket dropdown | free km + brackets |
| 2 | Condition | radio: Excellent / Good / Fair | enum |
| 3 | Full Name | text | — |
| 3 | WhatsApp Number | tel (+971…) | E.164 |
| 3 | Email | text (optional/required TBD) | — |

**Make→Model dependency:** changing Make resets Model and repopulates its options; Model disabled until Make chosen.

### 5.2 States
```
FILLING        ─ user editing; live per-field validation
  └ submit "GET VALUATION"
VALIDATING     ─ zod validate all; on error → focus first invalid, stay FILLING
SENDING_OTP    ─ POST /api/otp/send (Twilio Verify start); spinner on button
OTP_ENTRY      ─ modal: 6-digit input, 60s resend countdown, attempts left
VERIFYING_OTP  ─ POST /api/otp/verify
SUBMITTING     ─ POST /api/leads (with verify token) → DB insert + /api/notify
SUCCESS        ─ thank-you modal "Our team will contact you shortly." (NO price)
ERROR(kind)    ─ recoverable, returns to nearest sensible state
```

### 5.3 OTP rules
- 6 digits, expiry ~10 min (Twilio Verify default).
- **Resend** disabled for 60s; max 3 resends/phone/hour.
- **Max 5 wrong attempts** → lock that phone 1 hour (server-enforced via `otp_attempts` + rate-limit).
- Auto-advance/auto-submit when 6th digit entered; paste support; numeric keyboard on mobile.

### 5.4 Error kinds & messages
| Kind | Trigger | UX |
|---|---|---|
| `validation` | field invalid | inline red text under field |
| `otp_send_failed` | Twilio/network | toast "Couldn't send code, try again", stay FILLING |
| `otp_invalid` | wrong code | shake input, "Incorrect code", show attempts left |
| `otp_expired` | >10 min | "Code expired — resend" |
| `rate_limited` | too many | "Too many attempts, try later" + cooldown timer |
| `submit_failed` | DB error | "Something went wrong, your code is still valid, retry" |
| `network` | offline | offline banner, retry button |

### 5.5 Anti-abuse (built into the flow)
- Honeypot hidden field + min time-on-form (reject sub-2s bots).
- Optional Turnstile/hCaptcha before OTP send.
- Server normalizes phone to E.164; optional UAE-only (`+971`) gate (config).
- Lead insert happens **server-side only**, after verify token — never trust the client.

### 5.6 Success behavior
- Thank-you modal, confetti-free (luxury restraint), CTA "Chat on WhatsApp now".
- Fire admin email + realtime dashboard push. Reset form. **No valuation/price shown.**

---

## 6. ADMIN DASHBOARD — screen-by-screen spec

### 6.1 Auth (`/admin/login`)
- Supabase Auth **email OTP / magic link** (no passwords to leak). Only emails in `profiles` (admin/manager) may enter. Session in httpOnly secure cookie. Middleware gates all `/admin/*`.

### 6.2 App shell (`(admin)/layout`)
- **Sidebar:** Dashboard · Leads · (Analytics·Inventory·Users·Website = flagged "soon") · Settings. Collapsible on mobile.
- **Topbar:** CarVibeDubai wordmark, 🔔 notifications (new-lead badge via realtime), user menu (profile, logout).
- Active route highlighted gold (matches mockups).

### 6.3 Dashboard overview (`/admin`)
- **Stat cards** (config-driven set):
  - Total Leads (count) · New Submissions Today (count, `created_at::date = today`) · Active Leads (status ∈ pending/contacted) · Website Visitors This Week (`page_views`) · Average Value AED (avg `estimated_value_aed`) · WhatsApp Clicks (events).
  - Each card: label, big tabular number, sublabel, mini sparkline where shown (Image B line/bar).
- **Charts (Recharts, gold):** Visitors line (last 7/30d), Submissions bar (per day). Gold stroke/fill, dark grid, tooltip.
- **Recent Leads** mini-table (5 latest) with status pills + "Follow Up" → opens lead detail.
- Loading skeletons; empty state ("No leads yet — share your link"); error state with retry.

### 6.4 Leads directory (`/admin/leads`)
- **Table columns:** index, Client Name, Mobile (⇅ sort), Car (Make Model Year), Mileage, Date (⇅ sort), Estimated Value (AED), **Status pill**.
- **Search:** by name or number (debounced). **Filters:** status, date range, make. **Sort:** mobile/date/value. **Pagination** (server-side, 25/page) or infinite scroll.
- **Inline status change:** dropdown on the pill → pending / contacted / valuation_sent / closed; optimistic update + toast; writes via PATCH (RLS allows status update only).
- **Per-row WhatsApp quick action:** a small WhatsApp icon on each row opens the WhatsApp app on that customer (same deep link as §6.5) — Sir Nash can contact a customer without even opening the detail page.
- **Row click → lead detail.** Owner-side **CSV/Excel export** button (admin-auth only, §16.2).
- **Realtime:** new lead row animates in at top with a subtle gold flash; 🔔 increments.

### 6.5 Lead detail (`/admin/leads/[id]`)
- Full record: name, phone, car (make/model/year/mileage/condition), email, date, source, status.
- **One-click WhatsApp to the customer — THE key feature.** A WhatsApp button opens the **WhatsApp application directly** on that customer's number, chat pre-filled and ready to send:
  `https://wa.me/<phone_e164>?text=<prefill: "Hi {name}, regarding your {year} {make} {model} valuation with CarVibe Dubai…">`.
  - Works on **mobile** (opens WhatsApp app) and **desktop** (WhatsApp Web/Desktop) with one click — no copy-pasting numbers.
  - **Calling:** from that same opened conversation, Sir Nash taps WhatsApp's native **call** icon to place a WhatsApp voice/video call. (WhatsApp exposes no URL that auto-starts a call, so the correct, reliable behavior is: one click opens the chat → the call button is right there. Anything claiming a "direct call URL" would break across devices.)
  - Phone stored as clean **E.164** (`+9715XXXXXXXX`) precisely so this deep link always resolves to the right WhatsApp account.
- Also a plain **Call** button (`tel:<phone>`) for a normal cellular call. Each WhatsApp open logs a `whatsapp_click` (feeds the WhatsApp Clicks stat).
- **Status** changer · **Estimated Value (AED)** editable (admin-only) · **Notes** textarea (autosave) · **Activity timeline** from `lead_events`.

### 6.6 Settings (`/admin/settings`)
- **Business contact:** WhatsApp number, call number, email — these drive the public site (single `settings` row).
- **Notifications:** which email receives alerts; toggle.
- **Feature flags:** Buy-a-Car on/off; show/hide stat cards.
- **Managers (basic):** invite by email → creates `profiles` row (role=manager). Remove access.
- **Profile:** display name, sign out everywhere.

### 6.7 Flagged-future screens
- Analytics (deeper charts), Inventory (Buy-a-Car listings), Website (content editor). Render a branded "Coming soon" so the nav matches the mockup without unscoped work.

### 6.8 Inventory / Buy-a-Car — OUT OF SCOPE now (Phase 2 outline)
**Per the proposal this is explicitly a separate build, not part of the current fee.** The "Buy a Car" button ships **built but disabled**; the marketplace itself is a future engagement.

- **Ships in this project (zero extra scope):** disabled "Buy a Car" button + an "Inventory" nav opening a branded *Coming soon* page. Controlled by `features.buyACar`. This makes the dashboard match Sir Nash's mockup without building the marketplace.
- **What a future Phase 2 would add (quoted separately when commissioned):**
  - `cars` table: make, model, year, price_aed, mileage_km, condition, `photos[]`, status (`available`/`reserved`/`sold`), `featured`, description, created_at.
  - Admin CRUD: add/edit/delete listings, drag-reorder, **photo upload to Supabase Storage** (owner-owned bucket).
  - Public side: listings grid + filters (make/price/year), listing detail page, **"Enquire on WhatsApp"** → logged as an `inventory_enquiry` lead.
  - Reuses the **same design system, auth, RLS, and patterns** — additive, not a rewrite.
- **Recommendation:** keep it Phase 2. Ship the lead system first (that is the revenue today); upsell Inventory once leads are flowing. This is a clean upsell, already pre-framed as out-of-scope in the signed proposal — no awkward renegotiation.

---

## 7. Data model (Supabase / Postgres)

```sql
-- enums
status:    'new' | 'pending' | 'contacted' | 'valuation_sent' | 'closed'
condition: 'excellent' | 'good' | 'fair'
role:      'admin' | 'manager'
event_t:   'page_view' | 'whatsapp_click' | 'otp_sent' | 'lead_created'

-- leads
id uuid pk default gen_random_uuid()
created_at timestamptz default now()
full_name text not null
phone_e164 text not null
phone_verified boolean default false
email text                         -- nullable (confirm req/opt)
make text not null
model text not null
year int not null check (year between 1980 and extract(year from now())+1)
mileage_km int check (mileage_km >= 0)
condition condition
status status default 'new'
estimated_value_aed numeric           -- ADMIN ONLY, nullable
source text default 'web'
notes text
assigned_to uuid references profiles(id)
-- consent & quality (Founder Ops, §16)
marketing_consent boolean default false · consent_at timestamptz
is_spam boolean default false · is_duplicate boolean default false
follow_up_at timestamptz                  -- optional reminder (§16.7)
index: (created_at desc), (status), (phone_e164), (make), (is_spam)

-- blocklist (spam / abuse control — blocked numbers can't submit)
phone_e164 text pk, reason text, created_by uuid, created_at timestamptz default now()

-- lead_events  (activity timeline / audit)
id uuid pk, lead_id uuid fk, actor uuid null, type text, meta jsonb, created_at

-- otp_attempts (rate-limit + audit; Twilio holds the real code)
id uuid pk, phone_e164 text, ip text, success boolean, created_at
index: (phone_e164, created_at), (ip, created_at)

-- events (analytics: visitors, whatsapp clicks)
id uuid pk, type event_t, path text, session_id text, meta jsonb, created_at
index: (type, created_at), (created_at)

-- profiles (admin/managers; id = auth.uid)
id uuid pk, role role default 'manager', display_name text, email text, created_at

-- settings (single row, business config)
id int pk default 1 check (id=1)
whatsapp_number text, call_number text, notify_email text
buy_a_car_enabled boolean default false
visible_stats text[]                  -- which cards to show
updated_at timestamptz
```

### Row Level Security (the ownership guarantee, enforced in DB)
- `leads`: **anon** → no SELECT/UPDATE/DELETE. INSERT only via server route (service role) after OTP verify **and** phone not in `blocklist`. **No anon DELETE policy at all.**
- **Owner/admin (Sir Nash)** → full SELECT + UPDATE(status, estimated_value, notes, assigned_to, is_spam) **and CSV export** — the data is his, so the owner is never crippled. Managers → SELECT + status update only.
- `events`/`otp_attempts`/`ad_spend`: insert via server; read = admin only. `blocklist`: admin only. `profiles`,`settings`: admin only (managers read settings).
- **Reconciling "developer can't delete/export" (proposal promise):** this is enforced by *key custody*, not by handicapping the owner. After handover the **owner holds the Supabase project + service-role key**; the developer keeps **no standing DB login** and any maintenance access is time-boxed and granted by the owner (per §17). So the owner exports freely; the developer simply has no persistent path to bulk-delete or exfiltrate. Auditable by anyone.

---

## 8. API / server action contracts

All return `{ ok: true, data } | { ok: false, error: { kind, message } }`. Zod-validated bodies. Secrets server-only.

```
POST /api/otp/send
  body: { phone, honeypot, startedAt }
  → checks rate limit + honeypot → Twilio Verify start → { ok, data:{ sent:true, resendInSec:60 } }

POST /api/otp/verify
  body: { phone, code }
  → Twilio Verify check → on success issue short-lived signed verifyToken (5 min, bound to phone)
  → { ok, data:{ verifyToken } }  | error otp_invalid|otp_expired|rate_limited

POST /api/leads
  body: { verifyToken, make, model, year, mileage_km, condition, full_name, phone, email? }
  → validate token matches phone → insert lead (service role, RLS-safe) → fire /api/notify
  → { ok, data:{ id } }

POST /api/events
  body: { type:'whatsapp_click'|'page_view', path?, sessionId? }  → 204

PATCH /api/leads/[id]        (admin auth required)
  body: { status?, estimated_value_aed?, notes?, assigned_to? }  → updates + writes lead_event

POST /api/notify             (internal, called server-side)
  → Nodemailer/Gmail SMTP → admin email with lead summary + deep link
```

---

## 9. State, data flow & realtime
- **Server Components** fetch admin data (leads, stats) on the server → fast, SEO-safe, less client JS.
- **Client state:** form (React Hook Form), modals, table filters (URL search params so views are shareable/back-button safe).
- **Realtime:** Supabase channel on `leads` INSERT → dashboard prepends row + bell badge.
- **Caching:** static public shell; dynamic admin with `revalidate`/no-store as needed. Stats can use short cache (e.g. 30s).
- **Optimistic UI** for status changes; rollback on error.

---

## 10. Validation rules (every field)
| Field | Rule | Error message |
|---|---|---|
| Make | required, in list | "Select a make" |
| Model | required, in list for make | "Select a model" |
| Year | required, 1980…now+1 | "Select a year" |
| Mileage | required, int ≥ 0, ≤ 1,000,000 | "Enter valid mileage" |
| Condition | required, enum | "Choose a condition" |
| Full Name | 2–60, letters/spaces/.'- | "Enter your name" |
| WhatsApp | E.164, valid UAE (+971) [config] | "Enter a valid UAE number" |
| Email | optional; if present valid email | "Enter a valid email" |
| OTP | 6 digits | "Enter the 6-digit code" |

Same Zod schema validates client and server (`lib/validation/lead.schema.ts`).

---

## 11. Component architecture + 500-line file trees

**Rule:** no file > 500 lines (target < 250); logic in `use-*.ts` hooks, JSX in components, rules in `*.schema.ts`, each file opens with a 3-line banner comment. Public ⟷ admin never cross-import. Server-only modules carry `import 'server-only'`.

```
components/public/valuation-form/
  index.tsx                 # FSM orchestrator (<150)
  desktop-card.tsx          # one-card layout (Image C)
  mobile-wizard.tsx         # stepped layout (Image A)
  step-car-details.tsx      # make/model/year/mileage
  step-condition.tsx        # excellent/good/fair
  step-contact.tsx          # name/whatsapp/email
  otp-modal.tsx             # code input + resend timer
  thank-you-modal.tsx
  make-model-select.tsx     # dependent dropdowns (gold glow)
  use-valuation-form.ts     # state machine + submit logic
  use-otp.ts                # send/verify/resend/cooldown
  lead.schema.ts            # zod (shared w/ server)
  form.types.ts

components/admin/leads-table/
  index.tsx                 # composition
  columns.tsx               # column defs
  row.tsx                   # one row + status pill
  toolbar.tsx               # search + filters
  pagination.tsx
  use-leads-query.ts        # fetch/sort/filter
  use-status-mutation.ts    # optimistic update

components/admin/dashboard/
  stat-card.tsx · stat-grid.tsx · visitors-chart.tsx · submissions-chart.tsx · recent-leads.tsx
components/admin/lead-detail/ · components/admin/sidebar/ · components/admin/topbar/
components/ui/  Button Input Select Radio Dialog Toast Pill Card Skeleton Spinner Tooltip Badge
lib/  supabase/{client,server,admin}.ts · twilio/verify.ts · email/{transport,templates}.ts ·
      rate-limit/index.ts · security/{headers,csp}.ts · seo/{meta,jsonld}.ts ·
      validation/*.schema.ts · env.ts · utils/{phone,format,cn,date}.ts
config/  brand.ts · vehicles.ts · features.ts · copy.ts
```

---

## 12. Security architecture (build-time)
- **Headers** (`middleware.ts` + `next.config`): HSTS preload, strict **CSP** (nonce, allowlist self+Supabase+Twilio+WhatsApp+fonts, `frame-ancestors 'none'`), `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off), COOP/CORP same-origin.
- **Auth:** admin via Supabase email-OTP, httpOnly cookies, middleware gate; customer via Twilio Verify before any DB write.
- **RLS** per §7 (no delete, no export, anon can't read leads).
- **Rate limiting** (Upstash or `otp_attempts`): OTP send 3/h/phone + 10/h/IP, form submit caps.
- **Validation** with Zod at every boundary; reject unknown fields; parameterized queries only; no `dangerouslySetInnerHTML`.
- **Secrets** only in Vercel env / server routes; `lib/env.ts` validates on boot; service-role key never reaches client.
- **Admin noindex**, blocked in robots.

---

## 13. SEO & performance
- Per-route Metadata API (title/description/OG/Twitter); canonical URLs.
- JSON-LD: `Organization`, `LocalBusiness`/`AutoDealer` (Dubai), `FAQPage` (How It Works), `BreadcrumbList`.
- `app/sitemap.ts` (public only) + `app/robots.ts` (disallow `/admin`,`/api`).
- `next/image` hero, font `display:swap`, lazy below-the-fold, no CLS on the form, minimal client JS (server components).
- Targets: Lighthouse mobile ≥ 90 across the board; LCP < 2.5s; CLS < 0.1.

---

## 14. Accessibility & Arabic-readiness
- Labels on every input, visible focus (gold ring), keyboard nav, `aria-live` on OTP errors, dropdowns with arrow-key + type-ahead, color-contrast AA on gold-on-black.
- **Arabic later:** keep all copy in `config/copy.ts`, structure for `dir="rtl"` (logical CSS properties), so a future Arabic add-on is a content+toggle job, not a rebuild. (Arabic itself is out-of-scope now.)

---

## 15. Config & content (client-editable, data-driven)
```
config/brand.ts     name, monogram, whatsappNumber, callNumber, notifyEmail, goldHex
config/vehicles.ts  MAKES[], MODELS{make:[]}, YEARS range, MILEAGE_BRACKETS[]
config/features.ts  { buyACar:false, stats:[...], turnstile:false, uaeOnlyPhone:true }
config/copy.ts      headline, sub, howItWorks steps, footer credit
```
Business-changeable values also live in the `settings` table so Sir Nash edits numbers from the dashboard without code. Adding a make/model = one array edit (or a future admin screen).

---

## 16. Founder operations & growth

Sir Nash's actual need is simple: **leads, plus a tally of how many people visited the site and how many filled up the valuation.** No ad tracking, no attribution, no cost-per-lead. These tools cover exactly that, plus the basics that keep leads clean and reachable. All on **Vercel + Supabase**, first-party (no Google Analytics, privacy-friendly for the UAE).

### 16.1 Visitor & valuation tally (the core metric he asked for)
- This is already the heart of the dashboard (§6.3): the **Website Visitors** and **Car Submissions** cards from Sir Nash's own mockup.
- First-party measurement: every page view writes a `page_view` row to `events`; every completed valuation is a `lead`. **No third-party tracker.**
- **Simple funnel** on the dashboard: **Visited → Started form → Submitted valuation → Verified lead**, with the conversion count/% (e.g. *"8,745 visitors → 312 valuations"*). That is precisely "how many tried to visit + how many filled up" — nothing more.
- Range toggle: **Today / This Week / This Month.**

### 16.2 Owner data export (his data, his right)
- Admin **"Export"** button on the Leads page → CSV/Excel, respects current filters and date range. Server route streams from Supabase (admin-auth only).
- This is the **owner's** capability; the developer-side restriction is handled by key custody (§7 RLS reconciliation, §17), not by removing the owner's export.

### 16.3 New-lead notification (admin) — Gmail only
- Per the proposal, a new lead triggers an **automatic Gmail email** to Sir Nash (free) with the lead summary + a one-click link to the lead detail. **This is the alert channel. No Telegram, no SMS, no Web Push.**
- Keep two things separate, they are NOT the same feature:
  - **Notification** = email *tells* Sir Nash a lead arrived (Gmail) + the lead appears in the dashboard in real time.
  - **Contact** = how Sir Nash *reaches the customer* = **one-click WhatsApp** (see §6.5). This is the heart of the product.
- `/api/notify` sends only the Gmail message; failures are non-blocking and retried.

### 16.4 Duplicate & spam control
- On insert, flag `is_duplicate` if the same `phone_e164` submitted within N days (config). Admin sees a "repeat" badge.
- **"Mark as spam / Block number"** in lead detail → adds to `blocklist`; blocked numbers are rejected at `/api/otp/send` and `/api/leads`. Keeps the leads table clean and the tally honest.

### 16.5 Consent & privacy (UAE PDPL, light)
- **Consent checkbox** in Step 3 ("I agree to be contacted about my valuation") → store `marketing_consent` + `consent_at`. Reasonable since Sir Nash contacts customers on WhatsApp; aligns with UAE PDPL (Federal Decree-Law 45/2021).
- **/privacy** + **/terms** pages (plain language). Because analytics is first-party with **no third-party trackers**, no heavy cookie banner is needed — a short notice suffices.

### 16.6 Trust signals (more leads from the same traffic)
- Config-driven **testimonials**, trust badges, and a rating strip on the landing. Higher conversion = more valuations from the visitors he already has. Content in `config/copy.ts`.

### 16.7 CRM-lite lifecycle
- Status pipeline (new → pending → contacted → valuation_sent → closed), `assigned_to` for managers, autosaved notes, and an optional **follow-up reminder** (`follow_up_at` + "due today" filter) so no lead goes cold.

---

## 17. Advanced security hardening (Vercel + Supabase specifics)

The base layers are in §12. These upgrades move it from "good" to genuinely advanced — and all are achievable on Vercel + Supabase.

### 17.1 Edge / DDoS / WAF
- Put **Cloudflare (free) in front of Vercel** (DNS + proxy): WAF managed rules, **Bot Fight Mode**, edge rate-limiting, and country rules if UAE-only. This is the layer Vercel alone doesn't fully cover for volumetric attacks. (Alternatively, Vercel's built-in DDoS + firewall on Pro — note the cost.)
- Keep app-level rate limits (§12) as defense-in-depth.

### 17.2 Admin 2FA
- Add **TOTP (authenticator app)** on top of Supabase email-OTP for the `admin` role (Supabase MFA). Even if an inbox is compromised, the dashboard isn't.

### 17.3 Monitoring & alerting
- **Sentry** for runtime errors (client + server routes). **Uptime monitor** (UptimeRobot/BetterStack free) hitting `/api/health`. Alerts go to **your** email so you (the maintainer) hear about problems before the client does. (This is dev-side ops monitoring — unrelated to Sir Nash's Gmail lead alerts.)

### 17.4 Backups & restore (important on Supabase free tier)
- Supabase **free tier has limited/automatic backups only** — Sir Nash must know this. Add a scheduled **logical backup**: a **Vercel Cron** (or Supabase scheduled Edge Function) that runs a `pg_dump`/`COPY` export to **client-owned storage** (Supabase Storage bucket or his Google Drive) weekly.
- Document a **tested restore runbook** (don't trust an untested backup).

### 17.5 Secrets & supply chain
- Vercel env vars scoped per environment (Production vs Preview); **service-role key only in server scope**, never `NEXT_PUBLIC_`. Rotation schedule for Twilio/Supabase/Gmail app password.
- **Dependabot** + `npm audit` as a CI gate; committed lockfile; pin actions.

### 17.6 Disclosure, audit & PII hygiene
- `/.well-known/security.txt` with a contact. **Audit log** via `lead_events` + an admin-action log. Minimize PII in logs (never log OTP codes or full numbers).

### 17.7 Pre-launch security gate (do before go-live)
- [ ] securityheaders.com + Mozilla Observatory → **A/A+**
- [ ] Verify RLS: anonymous client **cannot** SELECT `leads` (test it)
- [ ] No secret in client bundle (`grep` the build output)
- [ ] Rate-limit + blocklist + honeypot proven against a script
- [ ] Run an automated review (e.g. `/security-review`) and resolve findings
- [ ] Confirm no secret in git history; `.env` ignored

### 17.8 Honest confidence (not "100%")
No site is 100% secure. Implemented fully, this is **top ~5–10% of UAE small-business sites**. Strongest layers: headers (verifiable A+), RLS, validation. Residual risk lives in third-party providers, leaked credentials, and zero-days — which is why monitoring + backups + updates (ongoing, not one-time) are part of the plan. Security is a maintenance commitment, and that is exactly what the maintenance arrangement funds.

---

## 18. Build task breakdown (ordered — "everything to do")

**M0 — Foundation**
- [ ] Next.js + TS + Tailwind + ESLint/Prettier + Husky pre-commit
- [ ] Theme tokens (§3) in `tailwind.config` + globals; fonts
- [ ] `components/ui` primitives (Button, Input, Select, Radio, Dialog, Toast, Pill, Card, Skeleton)
- [ ] `lib/env.ts`, `config/*` skeletons, feature flags

**M1 — Public site (Phase 1)**
- [ ] Navbar + smooth-scroll + mobile menu
- [ ] Hero (image, headline, CTA) responsive vs form
- [ ] Valuation form shell: desktop one-card + mobile wizard
- [ ] Make→Model dependent dropdowns w/ gold glow
- [ ] Step car-details / condition / contact + per-field validation
- [ ] How It Works, Contact, Footer (credit line)
- [ ] WhatsApp FAB + click logging
- [ ] Responsive QA, Lighthouse pass

**M2 — Data + OTP + Admin core (Phase 2)**
- [ ] Supabase project, tables, enums, indexes, **RLS** policies
- [ ] `lib/twilio/verify` + `/api/otp/send` + `/api/otp/verify` + rate limit + honeypot
- [ ] `/api/leads` insert (server, verify-token gated) + `lead.schema`
- [ ] Form FSM wired to OTP + success modal
- [ ] Admin auth (Supabase email-OTP) + middleware gate + app shell (sidebar/topbar)
- [ ] Leads table: columns, search, filter, sort, pagination, status pills
- [ ] Lead detail: full view + WhatsApp deep link + status change + notes
- [ ] Realtime new-lead push + bell badge

**M3 — Notifications, stats, settings, hardening (Phase 3)**
- [ ] `/api/notify` Gmail SMTP email on new lead + template
- [ ] Dashboard stat cards + visitors/submissions charts (Recharts)
- [ ] `events`/`page_views` tracking → visitors + WhatsApp-click stats
- [ ] Settings: business contact, notify email, managers, feature flags
- [ ] Security headers/CSP, full validation pass, audit log (`lead_events`)
- [ ] Test suite: zod, phone, OTP wrappers, form e2e, admin e2e
- [ ] Cross-browser + device matrix

**M3.5 — Founder tools & advanced hardening (§16–§17)**
- [ ] Visitor/valuation tally + funnel (Visited→Started→Submitted) on dashboard (§16.1)
- [ ] Consent checkbox + `marketing_consent`/`consent_at`; `/privacy` + `/terms` (§16.5)
- [ ] Owner CSV/Excel export (admin-only, filtered) (§16.2)
- [ ] Per-row + lead-detail one-click WhatsApp-to-customer (message + native call) (§6.4–§6.5)
- [ ] Duplicate flag + blocklist (mark spam / block number) (§16.4)
- [ ] Testimonials/trust strip (config-driven) + follow-up reminder field (§16.6–§16.7)
- [ ] Cloudflare in front of Vercel (WAF + Bot Fight + edge rate limit) (§17.1)
- [ ] Admin TOTP 2FA (Supabase MFA) (§17.2)
- [ ] Sentry + uptime monitor + `/api/health` (§17.3)
- [ ] Scheduled `pg_dump` backup via Vercel Cron → owner storage + restore runbook (§17.4)
- [ ] Dependabot + `npm audit` CI gate; `security.txt` (§17.5–§17.6)

**M4 — Launch (Phase 4)**
- [ ] Connect domain, production env, HSTS/CSP verify, SSL
- [ ] securityheaders.com A+, Lighthouse ≥ 90, RLS deny-anon verification
- [ ] End-to-end live test with a real submission
- [ ] Seed `settings`, vehicle lists, copy; walkthrough + handover

---

## 19. Pending inputs (paste-in when Sir Nash provides)
| Need | Lands in |
|---|---|
| Cloudflare account (DNS in front of Vercel) | infra |
| Testimonials / trust copy | `config/copy.ts` |
| Exact gold hex | `config/brand.ts` + tokens |
| Logo / CVD monogram (SVG) | `public/brand/` |
| WhatsApp + Call numbers | `config/brand.ts` / `settings` |
| Vehicle Make/Model/Year/Mileage lists | `config/vehicles.ts` |
| Email required or optional | `lead.schema.ts` |
| Headline / sub / How-It-Works copy | `config/copy.ts` |
| Gmail account for alerts | env `GMAIL_SMTP_*` |
| Stat cards to show | `settings.visible_stats` |
| Domain spelling | env `NEXT_PUBLIC_SITE_URL` |
| Fonts (from Canva) | `app/layout.tsx` |

Everything reads from these placeholders — when values arrive, you paste, you don't refactor.

---
*Build doc for CarVibe Dubai · Strictly Confidential.*
