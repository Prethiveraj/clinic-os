# Clinic Growth SaaS — Requirements & Architecture

Status: Planning complete, ready for build. Target market: India. This document is written to be handed to Claude Code as the build spec — it defines stack, schema, flows, and file structure. Sections marked `TODO (owner)` need a decision or input from the product owner before or during build; everything else is a locked decision.

---

## 1. Product summary

A self-serve SaaS for clinics (dental, medical, wellness, etc.) in India. A visitor searches a clinic by name, gets an instant "growth score" built from real Google Places + site-health data, and can generate an AI-built demo website in the same flow. Paying subscribers get a live, hosted website (subdomain by default, custom domain supported), lead capture, and — post-MVP-validation only — ongoing SEO/content automation.

Business model: monthly/annual subscription via Razorpay. Primary distribution channel initially: the owner's own agency network (Adszoo), in addition to organic self-serve signups.

Explicit build-order constraint carried over from planning: **do not build section 9 (ongoing automation) until real clinics are paying for sections 1–8.** Everything through checkout + custom domain is MVP. Automation is phase 2, gated on validation.

---

## 2. Tech stack (locked)

| Layer | Choice | Why |
|---|---|---|
| App framework | Next.js (App Router, Node runtime) | One codebase serves the marketing site, owner dashboard, admin panel, and the per-clinic site renderer (SSR needed for per-request script injection). |
| Database | PostgreSQL | Self-hosted on the same VPS (or a single managed Postgres instance) — no Supabase. |
| ORM | Prisma or Drizzle | Either is fine; Prisma recommended for migration ergonomics. |
| Auth | Auth.js (NextAuth) with email/phone OTP | No Supabase Auth. OTP via an India-friendly provider (MSG91, or Twilio Verify). |
| AI generation | OpenAI API, structured outputs (JSON mode) | Generates clinic site content as JSON, not raw HTML — see §6. |
| Payments | Razorpay Subscriptions + Webhooks | India-native, handles recurring billing, UPI, cards. |
| Object storage | Cloudflare R2 (S3-compatible) | Clinic photos pulled from Google Places, logos. Site *content* stays in Postgres, not object storage. |
| Hosting | Self-managed VPS (Hetzner or DigitalOcean, ~₹400–450/mo entry tier) | Cheaper than PaaS once a DB is factored in, and required for §8's custom-domain SSL pattern. |
| Reverse proxy / TLS | Caddy, with on-demand TLS | Auto-issues SSL certs per custom domain the first time traffic arrives on that hostname — this is the mechanism that makes self-serve custom domains work without manual cert steps. |
| Bot/abuse protection | Cloudflare Turnstile (free) | On the public search form and signup, since public users can now trigger paid API calls (§10). |
| Third-party APIs | Google Places API, Google PageSpeed Insights API, OpenAI API, Razorpay API, (phase 2: Google Search Console API, WhatsApp Business/Twilio API) | |
| Email | Resend or AWS SES | Transactional (OTP fallback, receipts) and monthly reports (phase 2). |

**Why not Supabase/Lovable:** ruled out explicitly by product owner — needs raw control over per-request `<head>`/`<body>` script injection and custom-domain SSL provisioning, which no-code/BaaS platforms don't expose at that level.

---

## 3. Core architectural decision: content-as-data, not code-per-clinic

Do **not** generate a unique HTML/CSS file per clinic. Generate structured JSON content per clinic via OpenAI, store it in Postgres, and render every clinic through **one shared Next.js template** at request time.

Reasons this is load-bearing for the rest of the spec:
- Script injection (§6) becomes a per-clinic settings lookup at render time, not a file edit.
- Template bug fixes and design updates apply to every clinic instantly, with no regeneration step.
- The scoring/ranking algorithm's output format stays consistent across all clinics.
- Custom domain and subdomain routing (§8) both resolve to the same render path — only the hostname lookup differs.

If/when unique per-clinic design freedom is wanted (post-MVP), that's a different, heavier model (per-clinic code repo + isolated deploy) — explicitly out of scope for this build.

---

## 4. Data model

```
clinics
  id
  slug (unique, url-safe, derived from name + collision suffix)
  name
  address
  phone
  category                -- e.g. "Dental Clinic"
  google_place_id
  hours (jsonb)
  rating
  review_count
  photos (jsonb array of R2 URLs)
  created_at

site_health_checks
  id
  clinic_id (fk)
  has_existing_site (bool)
  existing_site_url
  mobile_friendly (bool)
  load_speed_score (int)   -- from PageSpeed Insights
  is_indexed (bool)
  checked_at

scores
  id
  clinic_id (fk)
  overall_score (0-100)
  sub_scores (jsonb)        -- { visibility, site_health, reviews, conversion_readiness }
  computed_at

site_content
  id
  clinic_id (fk, unique)
  headline
  about_copy
  services (jsonb array)
  seo_meta (jsonb)          -- title, description
  json_ld (jsonb)           -- schema.org LocalBusiness/MedicalBusiness markup
  generated_at
  prompt_version            -- track which prompt template produced this

site_settings
  id
  clinic_id (fk, unique)
  subdomain_slug (unique)
  custom_domain (nullable, unique)
  domain_verified (bool, default false)
  ga_measurement_id (nullable)
  gsc_verification_method   -- 'meta' | 'dns_txt'
  gsc_verification_value (nullable)
  custom_header_scripts (text, nullable)
  custom_body_scripts (text, nullable)
  status                    -- 'draft' | 'live' | 'suspended'

users
  id
  email
  phone
  clinic_id (fk, nullable)  -- set once they claim/own a clinic
  created_at

subscriptions
  id
  user_id (fk)
  clinic_id (fk)
  razorpay_customer_id
  razorpay_subscription_id
  plan_tier
  status                    -- 'active' | 'past_due' | 'cancelled'
  current_period_end

leads
  id
  clinic_id (fk)
  name
  phone
  message
  source                    -- 'contact_form' | 'click_to_call' | 'whatsapp'
  created_at

generation_usage           -- cost/abuse tracking, see §10
  id
  user_id (fk, nullable)
  clinic_id (fk, nullable)
  api                       -- 'places' | 'pagespeed' | 'openai'
  cost_estimate
  created_at
```

---

## 5. Customer journey (self-serve MVP)

1. **Search (no login).** Visitor enters a clinic name on the public search page. Turnstile-protected, rate-limited by IP. Backend calls Google Places API → writes/updates `clinics` row.
2. **Instant score (no login).** Backend runs the site-health check (PageSpeed Insights + basic index check) and the scoring function (§7) → writes `scores` row. Score + sub-score breakdown renders immediately. This step is cheap and stays open to unauthenticated visitors as the hook.
3. **Account creation (gate before the expensive step).** To generate the AI demo site, visitor must sign up (email/phone + OTP). This is the checkpoint before any OpenAI cost is incurred.
4. **Demo generation.** On verified signup, backend sends clinic data + the prompt template (§6) to OpenAI, gets structured JSON back, writes `site_content`, auto-assigns `subdomain_slug`, creates `site_settings` with `status = 'draft'`. Demo is live at `{slug}.yourbrand.in`, watermarked "Preview."
5. **Checkout.** Owner reviews the demo, clicks activate, completes Razorpay Checkout for a subscription plan.
6. **Activation.** Razorpay webhook confirms payment → `subscriptions.status = 'active'`, `site_settings.status = 'live'`, watermark removed.
7. **Domain setup (optional, self-serve).** Owner dashboard shows a "connect your domain" flow: enter domain → show required CNAME record → owner updates DNS at their registrar → owner clicks verify → backend confirms DNS resolution → `domain_verified = true`. First real request to that hostname triggers Caddy's on-demand TLS to auto-issue the cert. Subdomain keeps working as a fallback throughout.
8. **Leads.** Every contact-form/click-to-call/WhatsApp interaction on the live site writes to `leads`, visible in the owner's dashboard.
9. **Content edit requests (MVP).** Routed to the agency/admin manually — no self-serve content editor in MVP.
10. **Billing lifecycle.** Razorpay webhooks drive renewal, `past_due` on failed payment (site falls back to watermarked "demo" state rather than going dark), and `cancelled` on churn (site stays live watermarked, reactivation is a status flip, not a rebuild).

---

## 6. AI site generation

- Input to OpenAI: clinic's Places data (name, address, `regularOpeningHours`/`currentOpeningHours`, `types`, `rating`, `userRatingCount`, `reviews`/`reviewSummary`, `editorialSummary` where available).
- The full prompt template is written out in **`/prompts/site-generation.md`** (included alongside this doc) — drop it in at that path as-is. It's a starter draft; fine-tune wording once you see real output.
- Output: structured JSON matching a fixed schema (headline, about copy, services array, SEO meta title/description, JSON-LD schema block). Use OpenAI's structured output / JSON schema mode (`response_format: json_schema`) so the response is always parseable — never freeform text parsing.
- Store in `site_content`. Track `prompt_version` so future prompt changes can be attributed and old content can be identified for re-generation.
- Guardrail baked into the system prompt itself: no medical efficacy/diagnostic claims, no promises of outcomes, no fabricated specifics (awards, certifications, staff counts) not present in the source data — this is client-facing medical/health content, not generic local-business copy, and it's a legal exposure point if the model invents claims.

---

## 7. Scoring algorithm

Grounded in what the two APIs actually return (verified against current Google docs — Places API (New) field list and PageSpeed Insights v5), not assumed fields. Two things worth flagging up front because they change what's technically possible:

- **PageSpeed Insights has no "is this page indexed by Google" field.** Google shut down the standalone Mobile-Friendly Test API in Dec 2023 and folded mobile checks into Lighthouse itself. So "indexed" in the health check is necessarily a **proxy**, not a confirmed fact: check that `robots.txt` doesn't disallow crawling and the page has no `<meta name="robots" content="noindex">` tag. True indexation status only becomes knowable once an owner connects Search Console (phase 2, post-signup) — say this plainly in the dashboard copy rather than implying certainty ("no crawl blockers found" not "your site is indexed").
- **Conversion-readiness fields (phone number visible, booking link, contact form) aren't in either API** — they require a lightweight HTML fetch + parse of the clinic's existing site (if one exists) during the health-check step, looking for `tel:` links, a `<form>`, and WhatsApp/booking-link patterns.

Overall score = weighted average of four sub-scores, each 0–100:

| Sub-score | Weight | Computed from |
|---|---|---|
| Visibility | 25% | `userRatingCount` (tiered: 0 / 1–9 / 10–49 / 50–149 / 150+ → 0/25/50/75/100), `businessStatus == OPERATIONAL`, profile completeness (has `photos`, has `regularOpeningHours`, has `websiteUri`) — average the tier score with a completeness percentage. |
| Site health | 30% | If no existing site at all → hard 0 for this sub-score (single biggest fixable gap, should visibly dominate the report). If a site exists: PageSpeed `performance` category score (mobile strategy) × 40%, `seo` category score × 40%, `accessibility` category score × 20%, all on the API's native 0–1 scale ×100. |
| Reviews | 20% | `rating` normalized to 0–100 (`rating / 5 × 100`), blended with review recency where `reviews`/`reviewSummary` data is available (% of reviews within the last 12 months) — recency matters more than a static rating for a "growth" score. |
| Conversion readiness | 25% | Binary checks from the HTML parse, each worth 25 points: phone number present (`tel:` link), some booking/appointment mechanism (form, calendar link, or WhatsApp link), contact form present, click-to-call or WhatsApp button visible above the fold (heuristic: present in the first ~500 words of parsed text/DOM). |

Store both `overall_score` and the four sub-scores per clinic per §4, with `computed_at`, so the dashboard can chart score-over-time as well as the breakdown. These weights are a defensible starting point, not sacred — expect to retune them once real clinic data shows which sub-score actually correlates with owners feeling "yes, this is accurate."

---

## 8. Domains and hosting

- Every clinic gets `{slug}.yourbrand.in` by default. Requires one-time wildcard DNS (`*.yourbrand.in`) and a wildcard SSL cert (Let's Encrypt via DNS-01 challenge) — infra setup, not per-clinic work.
- Custom domain flow is self-serve (see journey step 7). Caddy's on-demand TLS handles per-domain cert issuance automatically — no manual cert step per clinic ever.
- The Next.js renderer resolves the incoming `Host` header (subdomain or custom domain) to a `clinics` row via `site_settings`, then server-renders using `site_content` + injects scripts per §9. Same render path regardless of hostname.

---

## 9. Script injection (GA, GSC, custom scripts)

Rendered per-request from `site_settings`, not baked into stored content:
- `ga_measurement_id` → inject standard GA4 snippet in `<head>` if present.
- GSC verification → either inject a meta tag (`gsc_verification_method = 'meta'`) or instruct DNS TXT method (recommended once on a custom domain, since it doesn't depend on the page being live).
- `custom_header_scripts` / `custom_body_scripts` → raw text blobs injected verbatim into `<head>` / before `</body>`. Sanitize/escape carefully; this is intentionally a power-user field (remarketing pixels, chat widgets) but must not be exposed to end-site visitors as an XSS vector for the owner's own dashboard — validate that only the clinic's own authenticated owner (or admin) can write to it.

---

## 10. Abuse and cost protection

Self-serve means public users can trigger paid API calls. Controls required from MVP:
- Turnstile on the public search form and signup.
- Rate limit Google Places lookups per IP and per account.
- Gate OpenAI generation behind a verified account (journey step 3) — never allow generation pre-signup.
- **Generation quota (confirmed):** one free demo generation per account. Regeneration (re-running the OpenAI call to refresh content) is only permitted once the clinic has an active subscription. Enforce this in the `/api/clinics/[id]/generate` route by checking `subscriptions.status` before allowing a second call for the same `clinic_id`.
- Set a Google Cloud daily quota cap on the Places/PageSpeed keys and a monthly spend cap on the OpenAI key — do this before any code is deployed, not after.
- Log every paid API call to `generation_usage` for cost visibility in the admin panel.

---

## 11. Admin panel (agency/owner view)

- List all clinics with status (prospect / demo / live / suspended / churned).
- Manually trigger regeneration or a score refresh for any clinic.
- Edit the global prompt template without a code deploy (read from `/prompts/site-generation.md` or a DB-stored equivalent — pick one at build time).
- View `generation_usage` for API cost visibility.

---

## 12. Environment variables

```
DATABASE_URL=
NEXTAUTH_SECRET=
GOOGLE_PLACES_API_KEY=
GOOGLE_PAGESPEED_API_KEY=
OPENAI_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_TURNSTILE_SITE_KEY=
CLOUDFLARE_TURNSTILE_SECRET_KEY=
OTP_PROVIDER_API_KEY=          -- MSG91 or Twilio Verify
RESEND_API_KEY=                -- or SES credentials
APP_BASE_DOMAIN=yourbrand.in
```

---

## 13. Suggested project structure

```
/app
  /(marketing)/page.tsx          -- public search + landing
  /(dashboard)/dashboard/...     -- owner dashboard (auth-gated)
  /(admin)/admin/...             -- agency/admin panel (auth-gated, role check)
  /[[...site]]/page.tsx          -- catch-all clinic site renderer (resolves Host header)
  /api/clinics/search/route.ts   -- Places lookup
  /api/clinics/[id]/score/route.ts
  /api/clinics/[id]/generate/route.ts   -- OpenAI generation (auth required)
  /api/domains/verify/route.ts
  /api/webhooks/razorpay/route.ts
  /api/leads/route.ts
/lib
  /places.ts
  /pagespeed.ts
  /scoring.ts
  /openai.ts
  /razorpay.ts
  /r2.ts
  /auth.ts
/prisma (or /drizzle)
  schema.prisma
/prompts
  site-generation.md             -- TODO (owner): drop in prompt template here
```

---

## 14. MVP scope vs Phase 2

**MVP (build now):** §1–§13 above through checkout, subdomain hosting, custom domain connection, lead capture, admin panel basics.

**Phase 2 (only after 3–5 real clinics are paying):** monthly content refresh via OpenAI, Google Business Profile sync, automated review-request campaigns (WhatsApp/SMS), sitemap resubmission via Search Console API, monthly performance report emails, multi-location support, self-serve content editor.

---

## 15. Open items before/during build

All previously-open decisions have a default now, so the build isn't blocked. Two are placeholders that need a real value swapped in once decided — everything else is final unless you change it during fine-tuning:

- **ORM:** Prisma — confirmed.
- **Site-generation prompt:** drafted in `/prompts/site-generation.md` — fine-tune wording once you see real output against real clinics.
- **Scoring weights:** drafted in §7 above, grounded in actual Places/PageSpeed fields — retune once real data shows what correlates with owner reactions.
- **Generation quota:** confirmed — one free demo per account, regeneration gated behind an active subscription.
- **Brand/domain name:** not decided yet. `APP_BASE_DOMAIN` in §12 and every `{slug}.yourbrand.in` reference in this doc use `yourbrand.in` as a **placeholder literal** — swap it for the real domain in the env var (and in Caddy's config + DNS) the moment it's picked. Nothing else in the architecture depends on the name itself.
