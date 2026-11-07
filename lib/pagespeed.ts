/**
 * Google PageSpeed Insights v5 client.
 * Docs: https://developers.google.com/speed/docs/insights/v5/get-started
 *
 * Note: PSI has no "is this page indexed" field — that's a proxy check done
 * separately in lib/siteHealth.ts (robots.txt / meta robots), not here.
 */

import { requireEnv } from "@/lib/env";

export type PageSpeedResult = {
  performance: number | null; // 0-1 native scale
  seo: number | null;
  accessibility: number | null;
};

export async function getPageSpeedScores(url: string): Promise<PageSpeedResult> {
  const key = requireEnv("GOOGLE_PAGESPEED_API_KEY");

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("strategy", "mobile");
  for (const category of ["performance", "seo", "accessibility"]) {
    endpoint.searchParams.append("category", category);
  }

  const res = await fetch(endpoint.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`PageSpeed request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const categories = data.lighthouseResult?.categories ?? {};

  return {
    performance: typeof categories.performance?.score === "number" ? categories.performance.score : null,
    seo: typeof categories.seo?.score === "number" ? categories.seo.score : null,
    accessibility: typeof categories.accessibility?.score === "number" ? categories.accessibility.score : null,
  };
}
