import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateSentimentSummary } from "@/lib/ai";

/** v2 §1: on-demand sentiment rollup over the clinic's most recent reviews. */
export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ error: "No clinic on this account" }, { status: 400 });

  const reviews = await prisma.review.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { reviewTime: "desc" },
    take: 20,
  });

  const summary = await generateSentimentSummary(reviews.map((r) => ({ rating: r.rating, text: r.text })));

  await prisma.generationUsage.create({
    data: { api: "groq", userId: user.id, clinicId: user.clinicId, costEstimate: 0 },
  });

  return NextResponse.json({ summary });
}
