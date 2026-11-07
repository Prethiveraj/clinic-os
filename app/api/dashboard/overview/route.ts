import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ clinic: null });

  const clinic = await prisma.clinic.findUnique({
    where: { id: user.clinicId },
    include: {
      scores: { orderBy: { computedAt: "desc" }, take: 10 },
      siteContent: true,
      siteSettings: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      leads: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  return NextResponse.json({ clinic });
}
