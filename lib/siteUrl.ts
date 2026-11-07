import { requireEnv } from "@/lib/env";

export function appBaseDomain(): string {
  return requireEnv("APP_BASE_DOMAIN").toLowerCase();
}

/** Scheme and port follow NEXTAUTH_URL, so links work on http://localhost:3000 and https in production. */
function origin(hostname: string): string {
  const app = new URL(requireEnv("NEXTAUTH_URL"));
  return `${app.protocol}//${hostname}${app.port ? `:${app.port}` : ""}`;
}

export function subdomainHost(slug: string): string {
  return `${slug}.${appBaseDomain()}`;
}

/** Public URL of a clinic's site: verified custom domain if any, otherwise its subdomain. */
export function siteBaseUrl(
  settings: { subdomainSlug: string; customDomain: string | null; domainVerified: boolean } | null
): string | null {
  if (!settings) return null;
  if (settings.customDomain && settings.domainVerified) return `https://${settings.customDomain}`;
  return origin(subdomainHost(settings.subdomainSlug));
}

/** The host a clinic's site is reachable on, without the scheme — for display. */
export function siteDisplayHost(settings: { subdomainSlug: string; customDomain: string | null; domainVerified: boolean }): string {
  return settings.customDomain && settings.domainVerified ? settings.customDomain : subdomainHost(settings.subdomainSlug);
}
