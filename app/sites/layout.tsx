export const dynamic = "force-dynamic";
import type { ReactNode } from "react";
import Script from "next/script";
import "@/app/globals.css";
import { displayFont } from "@/lib/fonts";
import { resolveClinicByHost } from "@/lib/resolveSiteByHost";

/**
 * Independent root layout for clinic public sites (requirements §3, §8).
 * One shared template renders every clinic — only the hostname lookup differs
 * between a {slug}.APP_BASE_DOMAIN subdomain and a verified custom domain.
 */
export async function generateMetadata() { const site=await resolveClinicByHost(); return {robots:{index:site?.status === "live",follow:site?.status === "live"}}; }

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const site = await resolveClinicByHost();
  if (!site) {
    // Unknown host: the page below calls notFound(), which renders sites/not-found
    // inside this shell with a 404 status. (Throwing here would skip the shell.)
    return (
      <html lang="en" className={displayFont.variable}>
        <body className="bg-white text-slate-900 antialiased">{children}</body>
      </html>
    );
  }

  const isLive = site.status === "live";

  return (
    <html lang="en" className={displayFont.variable}>
      <body className="bg-white text-slate-900 antialiased">
        {site.gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${site.gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${site.gaMeasurementId}');`}
            </Script>
          </>
        )}

        {site.gscVerificationMethod === "meta" && site.gscVerificationValue && (
          <meta name="google-site-verification" content={site.gscVerificationValue} />
        )}

        {/* requirements §9: power-user field, verbatim — write access is the security boundary (see api/dashboard/settings) */}
        {site.customHeaderScripts && (
          <script dangerouslySetInnerHTML={{ __html: site.customHeaderScripts }} />
        )}

        {!isLive && (
          <div className="sticky top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
            Preview — this site is not yet live.{" "}
            {site.status === "draft" ? "Complete checkout to publish it." : "Billing needs attention."}
          </div>
        )}

        {children}

        {site.customBodyScripts && (
          <script dangerouslySetInnerHTML={{ __html: site.customBodyScripts }} />
        )}
      </body>
    </html>
  );
}
