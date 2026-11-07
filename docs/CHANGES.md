# Files changed from the supplied codebase

See SETUP-UPDATED.md for behavior, setup and verification limits.

## Modified

- .env.example
- app/(admin)/layout.tsx
- app/(dashboard)/layout.tsx
- app/(marketing)/audit/running/page.tsx
- app/(marketing)/clinic/[id]/page.tsx
- app/(marketing)/page.tsx
- app/api/admin/clinics/[id]/regenerate/route.ts
- app/api/admin/clinics/[id]/reviews-sync/route.ts
- app/api/checkout/route.ts
- app/api/clinics/[id]/generate/route.ts
- app/api/clinics/[id]/score/route.ts
- app/api/clinics/search/route.ts
- app/api/dashboard/blog/[id]/route.ts
- app/api/dashboard/leads/[id]/convert/route.ts
- app/api/dashboard/patients/[id]/route.ts
- app/api/dashboard/reviews/[id]/reply/route.ts
- app/globals.css
- app/sites/[[...site]]/page.tsx
- app/sites/layout.tsx
- app/sites/sitemap.xml/route.ts
- components/AuditProgress.tsx
- components/GenerateDemoButton.tsx
- components/landing/SearchForm.tsx
- components/site/BlogViews.tsx
- lib/ai.ts
- lib/clinicIngest.ts
- lib/env.ts
- lib/fonts.ts
- lib/groq.ts
- lib/places.ts
- lib/resolveSiteByHost.ts
- middleware.ts
- next-env.d.ts
- next.config.mjs
- package-lock.json
- package.json
- README.md
- scripts/verify-integrations.ts
- tests/e2e/run.ts
- tests/unit/groq.test.ts

## Added

- app/(marketing)/design-preview/[section]/page.tsx
- app/(marketing)/design-preview/page.tsx
- app/(marketing)/preview/[id]/[...section]/page.tsx
- app/(marketing)/preview/[id]/page.tsx
- app/(marketing)/privacy/page.tsx
- app/(marketing)/robots.txt/route.ts
- app/(marketing)/sitemap.ts
- app/(marketing)/terms/page.tsx
- app/api/clinics/audit/route.ts
- app/sites/robots.txt/route.ts
- components/site/ClinicWebsite.tsx
- docs/dependency-audit.json
- docs/RESEARCH.md
- lib/searchTicket.ts
- lib/seo.ts
- public/attribution/google-maps.svg
- scripts/prepare-build.mjs
- scripts/windows-output-plugin.mjs
- SETUP-UPDATED.md
- tests/unit/discoveryAndSeo.test.ts
