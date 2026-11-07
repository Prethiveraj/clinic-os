import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** v2 §1: list the signed-in owner's clinic reviews, most recent first. */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ reviews: [] });

  const reviews = await prisma.review.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { reviewTime: "desc" },
  });

  return NextResponse.json({ reviews });
}
