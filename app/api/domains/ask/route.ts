import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Caddy's on-demand TLS "ask" endpoint (requirements §8) — Caddy calls this
 * before issuing a cert for a hostname it hasn't seen before, so we only ever
 * issue certs for domains an owner has actually connected and verified.
 * https://caddyserver.com/docs/json/apps/tls/automation/policies/on_demand/ask/
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return new NextResponse(null, { status: 400 });

  const settings = await prisma.siteSettings.findFirst({
    where: { customDomain: domain, domainVerified: true },
  });

  return settings ? new NextResponse(null, { status: 200 }) : new NextResponse(null, { status: 403 });
}
