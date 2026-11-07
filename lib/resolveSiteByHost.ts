import { appBaseDomain } from "@/lib/siteUrl";
import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type ResolvedSite = Awaited<ReturnType<typeof resolveClinicByHost>>;

/**
 * Requirements §8: same lookup path for subdomain and custom-domain traffic —
 * only the hostname match differs. Memoized per-request so the layout (script
 * injection) and the page (content render) don't double-query.
 */
export const resolveClinicByHost = cache(async () => {
  const host = (await headers()).get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  const baseDomain = appBaseDomain();

  const suffix = `.${baseDomain}`;
  const isSubdomain = hostname.endsWith(suffix);

  const siteSettings = isSubdomain
    ? await prisma.siteSettings.findUnique({
        where: { subdomainSlug: hostname.slice(0, -suffix.length) },
        include: { clinic: { include: { siteContent: true } } },
      })
    : await prisma.siteSettings.findFirst({
        where: { customDomain: hostname, domainVerified: true },
        include: { clinic: { include: { siteContent: true } } },
      });

  return siteSettings;
});
