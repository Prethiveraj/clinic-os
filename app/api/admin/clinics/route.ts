import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** Requirements §11: list all clinics with status. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      scores: { orderBy: { computedAt: "desc" }, take: 1 },
      siteSettings: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    clinics: clinics.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      latestScore: c.scores[0]?.overallScore ?? null,
      siteStatus: c.siteSettings?.status ?? null,
      subdomain: c.siteSettings?.subdomainSlug ?? null,
      customDomain: c.siteSettings?.customDomain ?? null,
      subscriptionStatus: c.subscriptions[0]?.status ?? null,
    })),
  });
}
