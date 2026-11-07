# Clinic Growth OS

Clinic discovery, growth audits, Groq-generated websites, leads and owner-approved articles.

**Stack:** Next.js 15, TypeScript, Tailwind CSS, PostgreSQL and Prisma.

## Run the frontend locally

Install **Node.js 22 LTS** and **Git**, then run in PowerShell:

```powershell
git clone https://github.com/Prethiveraj/clinic-os.git
cd clinic-os
npm ci
Copy-Item .env.example .env
npm run prisma:generate
npm run dev
```

Open **http://localhost:3000** for the homepage or **http://localhost:3000/design-preview** for the sample clinic website. These previews do not require live API keys; search, login and generation do.

On Windows, you can also double-click `Start-Clinic-Growth.cmd` after cloning and copying `.env.example` to `.env`. Keep the terminal open; press **Ctrl+C** to stop.

## Enable the full app

Fill in `.env` with:

- **PostgreSQL:** `DATABASE_URL` (local PostgreSQL or a hosted database).
- **Authentication:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`, `APP_BASE_DOMAIN=localhost`.
- **Google:** Places API (New) and PageSpeed keys; Places requires billing enabled.
- **Groq:** `GROQ_API_KEY`; `GROQ_MODEL` is optional.
- **Email:** SMTP credentials and `EMAIL_FROM` for sign-in codes.
- **Turnstile:** site and secret keys, configured for your local hostname.

Then stop the dev server and run:

```powershell
npm run check:env
npm run prisma:deploy
npm run dev
```

Optional: set `SEED_ADMIN_EMAIL` and run `npm run db:seed` to create an admin. Supabase enables asset storage; Razorpay enables subscriptions; `CRON_SECRET` protects scheduled jobs.

Never commit `.env`. Review generated clinic facts and content before publishing.

## Checks

```powershell
npm test
npm run build
```

More details: [Setup guide](SETUP-UPDATED.md) · [Environment template](.env.example)
