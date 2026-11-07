> Updated working copy: start with [SETUP-UPDATED.md](SETUP-UPDATED.md). Groq and the original APIs are retained; Next.js is now 15.5.29. Earlier screenshots and instructions below refer to the original version.

# Clinic Growth OS

Self-serve growth platform for clinics in India. A clinic owner searches their clinic and gets a
Growth Score built from Google data. The platform then generates a website, takes payment, hosts the
site on a subdomain or the clinic's own domain, and keeps working for the owner: leads, review
replies, weekly SEO blog drafts that the owner approves, and weekly Google photo reminders.

Full product spec: [`docs/requirements.md`](docs/requirements.md).

## Stack

| Part | Service | Cost |
|---|---|---|
| App (frontend + backend) | Next.js 14 App Router, TypeScript, Tailwind | — |
| Database | PostgreSQL + Prisma (local, Neon or Supabase) | Free tiers |
| Login | Email one-time code (Auth.js) | — |
| Business data and site audit | Google Places API (New), PageSpeed Insights | Free monthly allowance; Places needs billing enabled |
| AI writing | Groq (`openai/gpt-oss-120b`, an open-weight model) | Free tier |
| Email | Gmail SMTP with an App Password | Free |
| Photo storage | Supabase Storage | Free tier |
| Bot protection | Cloudflare Turnstile | Free |
| Payments | Razorpay Subscriptions | Test mode free; live mode needs KYC |

Every service is required: the app has no demo mode or mock data. A missing key fails with a
clear message naming the variable, and `npm run check:env` lists any that are missing.

---

## 1. Get every key

Put each value in `.env` in the project root (copy `.env.example` first). For production, put the
same values in Vercel (see section 4).

### 1.1 PostgreSQL (`DATABASE_URL`)

**Option A: local (development).**

1. Install PostgreSQL 16 from https://www.postgresql.org/download/windows/ (EDB installer).
   Keep port 5432 and remember the password you set for the `postgres` user.
2. Create the database:
   `psql -U postgres -c "CREATE DATABASE clinic_growth_os;"`
   On Windows the full path is usually `"C:\Program Files\PostgreSQL\16\bin\psql.exe"`.
3. Set:
   `DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/clinic_growth_os"`

**Option B: Neon (production, free).**

1. Sign up at https://neon.tech and create a project (region: Singapore, closest to India).
2. Under **Connect**, copy two connection strings:
   - **pooled** (host contains `-pooler`): use it in Vercel as `DATABASE_URL`, adding
     `&pgbouncer=true` to the end.
   - **direct** (no `-pooler`): use it on your PC when running migrations.

Supabase Postgres also works if you prefer one account: use the "Transaction pooler" string with
`?pgbouncer=true` for Vercel and the "Direct connection" string for migrations.

### 1.2 `NEXTAUTH_SECRET` and `CRON_SECRET`

These are random strings you generate yourself. Run this twice, once for each variable:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`NEXTAUTH_SECRET` signs login sessions. `CRON_SECRET` protects `/api/cron/*`; Vercel sends it to
the scheduled jobs automatically. Use different values for local and production.

### 1.3 Google Places + PageSpeed (`GOOGLE_PLACES_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`)

1. Go to https://console.cloud.google.com → project dropdown → **New project** (e.g. `clinic-growth`).
2. **Billing**: link a billing account. Places requires one, and Google includes a free monthly
   allowance per API.
3. **APIs & Services → Library**: enable **Places API (New)** and **PageSpeed Insights API**.
4. **APIs & Services → Credentials → Create credentials → API key**.
5. Click the key → **API restrictions → Restrict key** → tick those two APIs → Save.
   Do not add website restrictions: the key is used only by the server.
6. **APIs & Services → Quotas**: set a daily cap on Places so a bug can't run up a bill.
7. Put the same key in both variables.

### 1.4 Groq (`GROQ_API_KEY`)

1. Sign up at https://console.groq.com (no card needed).
2. **API Keys → Create API Key** → copy it (starts with `gsk_`).
3. Optional: `GROQ_MODEL` picks another model id from https://console.groq.com/docs/models.
   The default is `openai/gpt-oss-120b`. Groq has retired its Llama chat models. The
   `llama-prompt-guard` models are safety classifiers that can't write text, so don't use them.
   To see the models your key can use:
   `curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_KEY"`
4. The free tier has per-minute and per-day request limits, shown in the Groq console. They are
   enough for testing and a small number of clinics.

### 1.5 Gmail SMTP (`SMTP_*`, `EMAIL_FROM`)

Gmail sends the login codes, blog-approval emails and weekly photo reminders.

1. Use a Gmail account for the app (a separate one is best, e.g. `clinicgrowth.app@gmail.com`).
2. Turn on **2-Step Verification**: https://myaccount.google.com/security
3. Create an **App Password** at https://myaccount.google.com/apppasswords. Name it "Clinic Growth"
   and copy the 16-character password, without spaces.
4. Set:
   ```
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="465"
   SMTP_USER="clinicgrowth.app@gmail.com"
   SMTP_PASS="abcdefghijklmnop"
   EMAIL_FROM="Clinic Growth <clinicgrowth.app@gmail.com>"
   ```
5. Gmail limits a normal account to roughly 500 emails a day. That's fine at the start; move to a
   domain email provider later and change only these five variables.

### 1.6 Email login: what to do

Nothing extra. Login is email-only, there are no phone or SMS codes, and MSG91 is no longer used.

1. Set `SEED_ADMIN_EMAIL` to your own email and run `npm run db:seed` once. That account becomes
   the admin (`/admin`).
2. Open `/login`, enter the email and type in the 6-digit code that arrives by Gmail. Codes expire
   after 10 minutes and work only once.
3. Clinic owners sign up the same way. Their account is created on first login and linked to
   their clinic when they generate its site.

### 1.7 Supabase Storage (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`)

This replaces Cloudflare R2. It stores the clinic photos copied from Google.

1. Sign up at https://supabase.com → **New project** (region: South Asia (Mumbai)). Set a database
   password and wait for the project to start.
2. **Storage → New bucket**:
   - name `clinic-photos`
   - turn **Public bucket** ON
   - save.
3. **Project Settings → API Keys**:
   - Copy the **Project URL** (`https://xxxx.supabase.co`) into `SUPABASE_URL`.
   - Copy a server key into `SUPABASE_SERVICE_ROLE_KEY`: either the **secret** key
     (`sb_secret_…`) or the legacy `service_role` key. Both work.
   - Never put this key in client code or anything starting with `NEXT_PUBLIC_`.
4. Set `SUPABASE_STORAGE_BUCKET="clinic-photos"`.

### 1.8 Cloudflare Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`)

Turnstile protects the public search box and the login form from bots.

1. Sign up at https://dash.cloudflare.com (free; you don't need a domain on Cloudflare).
2. **Turnstile → Add widget**: name it "Clinic Growth", choose **Managed** mode, and add hostnames:
   - `localhost`
   - your production domain (e.g. `clinicgrowth.in`)
   - your `*.vercel.app` URL.
3. Copy the **Site Key** into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **Secret Key** into
   `CLOUDFLARE_TURNSTILE_SECRET_KEY`.

For local development only, you can use Cloudflare's official test pair, which always passes:
site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

### 1.9 Razorpay (`RAZORPAY_*`)

1. Sign up at https://dashboard.razorpay.com and switch to **Test Mode** (toggle at the top).
   Test mode needs no KYC.
2. **Account & Settings → API Keys → Generate Test Key**. Copy the Key ID (`rzp_test_…`) into
   `RAZORPAY_KEY_ID` and the Key Secret into `RAZORPAY_KEY_SECRET`.
3. **Subscriptions → Plans → Create plan** twice:
   - "Starter" and "Growth", monthly, with your prices.
   - Copy the plan ids (`plan_…`) into `RAZORPAY_PLAN_STARTER` and `RAZORPAY_PLAN_GROWTH`.
4. **Account & Settings → Webhooks → Add new webhook**:
   - URL: `https://YOUR-DOMAIN/api/webhooks/razorpay`
   - Secret: any random string, which also goes in `RAZORPAY_WEBHOOK_SECRET`
   - Events: `subscription.activated`, `subscription.charged`, `subscription.pending`,
     `subscription.halted`, `subscription.cancelled`, `payment.failed`.

   Webhooks need a public URL, so set this up after deploying. On a local PC, a tunnel such as
   `cloudflared tunnel --url http://localhost:3000` gives you one.
5. To go live: complete KYC, switch to **Live Mode**, and repeat steps 2–4 there. Live keys,
   plans and webhooks are separate from test ones.

### 1.10 App URLs (`NEXTAUTH_URL`, `APP_BASE_DOMAIN`)

| | `NEXTAUTH_URL` | `APP_BASE_DOMAIN` | A clinic site opens at |
|---|---|---|---|
| Local | `http://localhost:3000` | `localhost` | `http://<slug>.localhost:3000` |
| Production | `https://clinicgrowth.in` | `clinicgrowth.in` | `https://<slug>.clinicgrowth.in` |

### 1.11 Check everything

```bash
npm run check:env             # lists any missing variable
npm run verify:integrations   # calls every real service with your keys
```

`verify:integrations` checks:
- the database connection and migrations;
- a real Places search and a PageSpeed run;
- a Groq JSON answer;
- an SMTP login and a test email to `SMTP_USER` (add `-- you@example.com` to send it elsewhere);
- a Supabase upload, public read and delete;
- that the Turnstile secret is accepted;
- that both Razorpay plans exist.

For each failure it prints the fix.

---

## 2. Run locally (Windows, macOS or Linux)

Next.js runs the client (React pages) and the server (API routes, database, cron endpoints) in one
process, so a single `npm run dev` starts both.

```bash
git clone https://github.com/Kailash1233/Clinic-Growth-OS.git
cd Clinic-Growth-OS
git checkout claude/web-app-api-keys-ujaylp
npm install
cp .env.example .env          # Windows PowerShell: copy .env.example .env
# fill in .env (section 1)
npm run check:env
npx prisma migrate deploy     # creates the tables
npm run db:seed               # makes SEED_ADMIN_EMAIL an admin
npm run verify:integrations   # optional but recommended
npm run dev                   # http://localhost:3000
```

Then:
1. Search a real clinic on the home page and run an audit.
2. Sign in at `/login` with your email.
3. Generate the site from the report page.
4. Open it at `http://<slug>.localhost:3000`. Chrome and Edge resolve `*.localhost` automatically.

To run the scheduled jobs by hand:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/blog-drafts
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/photo-reminders
```

To run a production build locally: `npm run build` then `npm start`.

### Tests

```bash
npm test          # unit tests (scoring, keywords, Groq client, SMTP, Supabase, Turnstile, URLs)
npx playwright install chromium   # once, for the end-to-end test
E2E_DATABASE_URL="postgresql://postgres:PASS@localhost:5432/cgos_e2e" npm run test:e2e
```

The end-to-end test:
- builds the production bundle and starts it (`next build` + `next start`);
- uses a real Postgres database and a real SMTP server it starts itself;
- drives Chromium through the whole product.

It never calls Google, Groq, Supabase, Cloudflare or Razorpay. Local stand-ins answer for those, so
it runs without keys. `npm run verify:integrations` is the check against the real services. Warning:
the database named in `E2E_DATABASE_URL` is dropped and recreated.

---

## 3. Go to production: checklist

1. **Domain.** Buy one (e.g. `clinicgrowth.in`).
2. **Database.** Create a Neon (or Supabase) database. From your PC, run once against the **direct**
   connection string:
   ```bash
   DATABASE_URL="<direct url>" npx prisma migrate deploy
   DATABASE_URL="<direct url>" SEED_ADMIN_EMAIL="you@example.com" npm run db:seed
   ```
   Run `migrate deploy` again whenever new migrations are added.
3. **Keys.** Create production keys:
   - Google key (with a quota cap)
   - Groq key
   - Gmail App Password
   - Supabase bucket (Public)
   - Turnstile widget with the production hostname
   - Razorpay keys and plans (test first, then live after KYC)
   - new `NEXTAUTH_SECRET` and `CRON_SECRET`.
4. **Deploy to Vercel** (section 4).
5. **Domains on Vercel:** add `clinicgrowth.in`, `www.clinicgrowth.in` and the wildcard
   `*.clinicgrowth.in`. The wildcard is what serves every clinic subdomain, and Vercel requires
   the domain's nameservers to point at Vercel for it.
6. **Razorpay webhook:** `https://clinicgrowth.in/api/webhooks/razorpay`. Then do a test payment
   with a Razorpay test card and check that the dashboard shows the subscription as Active.
7. **Smoke test.** Run `npm run verify:integrations` on your PC with the production `.env`. Then
   search a clinic, sign in, generate a site and open `https://<slug>.clinicgrowth.in`.
8. **Monitor.** Watch Vercel's logs, the Google Cloud billing alerts and the Groq usage page.
9. **Go live with payments:** swap in the Razorpay live keys, plans and webhook secret, then redeploy.

---

## 4. Deploy on Vercel

1. https://vercel.com → **Add New → Project** → import `Kailash1233/Clinic-Growth-OS`.
2. **Framework:** Next.js. Keep the defaults for build command (`npm run build`, which also runs
   `prisma generate`), output and install command.
3. **Production branch:** in Project → Settings → Git, set it to the branch you deploy (e.g.
   `main` after merging this branch).
4. **Environment Variables** (Settings → Environment Variables, Production + Preview). Add every
   variable from `.env.example`:

   | Variable | Production value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** URL + `&pgbouncer=true` |
   | `NEXTAUTH_URL` | `https://clinicgrowth.in` |
   | `APP_BASE_DOMAIN` | `clinicgrowth.in` |
   | `NEXTAUTH_SECRET`, `CRON_SECRET` | new random values |
   | `GOOGLE_PLACES_API_KEY`, `GOOGLE_PAGESPEED_API_KEY` | Google key |
   | `GROQ_API_KEY` (`GROQ_MODEL` optional) | Groq key |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Gmail |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Supabase |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Turnstile |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_STARTER`, `RAZORPAY_PLAN_GROWTH` | Razorpay |

   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `SUPABASE_URL` are read at build time, so redeploy after
   changing them.
5. **Deploy.** `vercel.json` already registers the two daily cron jobs (09:00 and 10:00 IST). They
   work on the Hobby plan, and Vercel sends `CRON_SECRET` to them automatically.
6. **Domains** (Settings → Domains): add the apex, `www` and `*.yourdomain` (see section 3, step 5).
7. Redeploy after any environment-variable change (Deployments → … → Redeploy).

**Clinic custom domains on Vercel.** When a clinic connects its own domain (e.g.
`lakshmidental.in`), add that domain to the Vercel project as well (Settings → Domains), so Vercel
issues its certificate. On a VPS, Caddy does this automatically instead (see `docs/Caddyfile` and
the `/api/domains/ask` endpoint).

---

## 5. Known limits

- The request rate limiter is in memory, per server instance. It's fine for one server; across many
  Vercel instances, a shared store such as Upstash Redis would make it exact.
- Google returns at most 5 reviews per place through the Places API.
- Google autocomplete (used for the blog's real search questions) is a public, undocumented
  endpoint. If it's unreachable, drafts fall back to template questions and show a "Generic
  questions" badge.
- Gmail sending is limited to about 500 emails a day per account.
- Not built yet: a score trend chart and a social-post generator.

## Project structure

```
app/(marketing)      home, audit, growth report, login
app/(dashboard)      owner dashboard: overview, leads, patients, reviews, blog, domain, settings
app/(admin)          admin: clinics, API usage, prompt editor
app/sites            every clinic's public site (resolved by Host header), blog, sitemap
app/api              backend routes, cron jobs, Razorpay webhook
lib/                 places, pagespeed, siteHealth, scoring, insights, groq, ai, email, otp,
                     storage (Supabase), turnstile, razorpay, keywordResearch, blog, notify
prisma/              schema, migrations, seed
scripts/             check-env, verify-integrations
tests/unit           node:test unit tests
tests/e2e            production-build end-to-end test (Playwright)
```
