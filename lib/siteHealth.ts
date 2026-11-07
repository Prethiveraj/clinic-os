/**
 * Lightweight HTML fetch + parse of a clinic's existing site.
 * Produces two things neither Places nor PageSpeed can give us:
 *  - a crawlability *proxy* for "indexed" (no confirmed-indexation API exists,
 *    see requirements §7 — the standalone Mobile-Friendly Test API was
 *    retired Dec 2023)
 *  - conversion-readiness signals (tel: link, booking mechanism, contact form,
 *    click-to-call/WhatsApp visible above the fold)
 */

export type ConversionChecks = {
  hasPhoneLink: boolean;
  hasBookingMechanism: boolean;
  hasContactForm: boolean;
  hasAboveFoldClickToAction: boolean;
};

export type CrawlabilityCheck = {
  robotsDisallowsAll: boolean;
  hasNoindexMeta: boolean;
  /** Proxy only — never state this as confirmed indexation to end users. */
  likelyCrawlable: boolean;
};

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { "User-Agent": "ClinicGrowthOS-HealthCheck/1.0" },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkRobotsAndIndexability(siteUrl: string): Promise<CrawlabilityCheck> {
  const origin = new URL(siteUrl).origin;

  let robotsDisallowsAll = false;
  const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`);
  if (robotsRes?.ok) {
    const text = await robotsRes.text();
    robotsDisallowsAll = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(\n|$)/i.test(text);
  }

  let hasNoindexMeta = false;
  const pageRes = await fetchWithTimeout(siteUrl);
  if (pageRes?.ok) {
    const html = await pageRes.text();
    hasNoindexMeta = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  }

  return {
    robotsDisallowsAll,
    hasNoindexMeta,
    likelyCrawlable: !robotsDisallowsAll && !hasNoindexMeta,
  };
}

export async function checkConversionReadiness(siteUrl: string): Promise<ConversionChecks> {
  const res = await fetchWithTimeout(siteUrl);
  if (!res?.ok) {
    return {
      hasPhoneLink: false,
      hasBookingMechanism: false,
      hasContactForm: false,
      hasAboveFoldClickToAction: false,
    };
  }

  const html = await res.text();
  const hasPhoneLink = /href=["']tel:/i.test(html);
  const hasContactForm = /<form[\s>]/i.test(html);
  const hasBookingMechanism =
    hasContactForm ||
    /calendly\.com|cal\.com|book(ing)?[-_]?(now|appointment)/i.test(html) ||
    /wa\.me\/|api\.whatsapp\.com/i.test(html);

  // Heuristic for "above the fold": look within roughly the first 500 words
  // of the visible-ish text/markup for a call-to-action signal.
  const stripped = html.replace(/<[^>]+>/g, " ");
  const words = stripped.trim().split(/\s+/).slice(0, 500).join(" ");
  const firstChunkHtml = html.slice(0, html.indexOf(words.slice(-20)) + 2000 || 3000);
  const hasAboveFoldClickToAction =
    /href=["']tel:/i.test(firstChunkHtml) || /wa\.me\/|api\.whatsapp\.com/i.test(firstChunkHtml);

  return { hasPhoneLink, hasBookingMechanism, hasContactForm, hasAboveFoldClickToAction };
}
