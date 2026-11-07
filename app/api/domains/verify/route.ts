import { appBaseDomain } from "@/lib/siteUrl";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dns from "dns/promises";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const connectSchema = z.object({ domain: z.string().min(3) });

/** Step 1: owner enters a domain — store it, return the CNAME target to configure. */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ error: "No clinic on this account" }, { status: 400 });

  const parsed = connectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid domain" }, { status: 400 });

  const domain = parsed.data.domain.toLowerCase().trim();
  const cnameTarget = appBaseDomain();

  await prisma.siteSettings.update({
    where: { clinicId: user.clinicId },
    data: { customDomain: domain, domainVerified: false },
  });

  return NextResponse.json({ domain, cnameTarget, instructions: `Create a CNAME record: ${domain} -> ${cnameTarget}` });
}

/** Step 2: owner clicks "verify" — confirm DNS actually resolves to us before flipping the flag. */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ error: "No clinic on this account" }, { status: 400 });

  const settings = await prisma.siteSettings.findUnique({ where: { clinicId: user.clinicId } });
  if (!settings?.customDomain) {
    return NextResponse.json({ error: "No domain connected yet" }, { status: 400 });
  }

  const cnameTarget = appBaseDomain();

  let verified = false;
  try {
    const records = await dns.resolveCname(settings.customDomain);
    verified = records.some((r) => r.toLowerCase().includes(cnameTarget.toLowerCase()));
  } catch {
    verified = false;
  }

  if (verified) {
    await prisma.siteSettings.update({
      where: { clinicId: user.clinicId },
      data: { domainVerified: true },
    });
  }

  return NextResponse.json({ verified });
}
