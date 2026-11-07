# Run the updated Clinic Growth OS

This is an updated working copy of your existing code. Your D: drive project was not changed because write access was not granted.

## Changes

- Kept Google Places, PageSpeed, Groq, Gmail SMTP, Supabase, Turnstile, Razorpay, PostgreSQL and Google autocomplete. No Gemini or OpenAI API integration was added.
- Added clinic/location selection instead of silently auditing the first Google result. Selected place IDs use signed, expiring tickets.
- Discovery requests fewer fields; full details are fetched after selection. Live provider failures do not substitute fake clinics.
- Removed automatic Google photo mirroring. New prospect records store the place ID and audit, while listing details are retrieved for the current interaction. Website facts are saved from the owner's confirmation form. Existing legacy data is not automatically deleted.
- Added confirmation of name, address, phone, category, hours and actual services before Groq generation. Services are an allowlist. This is owner attestation, not Google OAuth ownership verification.
- Added original platform and clinic designs inspired by Eloqwnt: large typography, neutral rounded panels, editorial spacing and pale gradients.
- Clinic sites now include home, about, services, contact, journal and approved articles, plus private owner previews.
- Added canonicals, Open Graph metadata, deterministic clinic structured data, draft noindex rules, live sitemaps, article reading time and contents navigation. No self-serving rating schema.
- Updated Next.js and affected dependencies, including asynchronous route params/headers for Next.js 15.

## Local setup

Use Node.js 22 LTS or later. Open a terminal in this project directory.

```powershell
npm ci
npm run prisma:generate
```

Fill the included `.env` placeholders locally. Keep secrets out of source control.

| Environment values | Purpose |
| --- | --- |
| DATABASE_URL | PostgreSQL connection |
| NEXTAUTH_SECRET | Long random session/signature secret |
| NEXTAUTH_URL | http://localhost:3000 locally |
| APP_BASE_DOMAIN | localhost locally |
| GOOGLE_PLACES_API_KEY | Places API (New), enabled with billing |
| GOOGLE_PAGESPEED_API_KEY | PageSpeed Insights |
| GROQ_API_KEY | Existing Groq generation provider |
| GROQ_MODEL | Optional; existing default openai/gpt-oss-120b |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM | Email sign-in and notifications |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY, CLOUDFLARE_TURNSTILE_SECRET_KEY | Bot protection, with your allowed hostnames |

The model name's `openai/` prefix identifies an open-weight model hosted by Groq. Requests go to api.groq.com; no OpenAI account or key is used.

Supabase is optional for owner-uploaded assets. Razorpay credentials and plans enable checkout and paid regeneration. CRON_SECRET protects scheduled jobs, which retain the original subscription eligibility rules.

```powershell
npm run check:env
npm run prisma:deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000. `/design-preview` is an illustrative layout requiring no database connection. Real search and generation need the credentials above.

Flow: search clinic and city, select the listing, inspect the report, sign in using the emailed code, confirm facts/services, generate, then review `/preview/<clinic-id>`. Preview navigation includes about, services, contact and published articles. An enquiry is not a confirmed appointment.

Review website copy before activating billing. Blog drafts stay pending until the owner approves them. People still need to check factual and medical accuracy.

## Checks and deployment

```powershell
npm run typecheck
npm test
npm run build
npm start
```

This is a server-backed Next.js application, not a static-only site. Use the existing Vercel or VPS/Caddy approach with PostgreSQL, production environment values, wildcard DNS and HTTPS as appropriate. The Windows build preparation script addresses an output-directory creation issue observed here.

`npm run verify:integrations` calls real services and sends a test email. Run it only with your credentials. The updated end-to-end suite requires a disposable PostgreSQL database through E2E_DATABASE_URL and recreates that named database; never supply a production database.

## Verification and limits

- TypeScript check passed; 30 unit tests passed.
- Production compilation passed. The final build should be rerun after entering deployment values.
- Dependency audit reported zero known vulnerabilities; see docs/dependency-audit.json.
- Real Google/Groq/billing/email integrations were not exercised with production keys.
- Browser visual QA was not completed: local loopback connections timed out and browser policy blocked local-file previews. Standalone design previews are included alongside the project for local review; their forms are disabled.
- The full database/browser end-to-end suite was updated but not executed here.

Some existing services offer free allowances, but the app is not guaranteed free to run. Google Places requires billing; payment processing and provider quota overages may cost money.

This update does not add Google Business Profile OAuth/direct publishing, medical literature research, appointment scheduling or live ranking measurement. Journal topics use the existing autocomplete/template flow and Groq drafts. The basic rate limiter remains in memory; use a shared limiter for multiple production instances. Review legacy Google data retention and complete operator/contact disclosures in the terms/privacy pages before public launch.
