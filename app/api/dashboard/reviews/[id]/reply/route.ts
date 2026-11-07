import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateReviewReply } from "@/lib/ai";

async function loadOwnedReview(reviewId: string, clinicId: string | undefined) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { clinic: true } });
  if (!review || review.clinicId !== clinicId) return null;
  return review;
}

/** v2 §1: generate (or regenerate) an AI-drafted reply for one review. Owner edits and posts it themselves. */
export async function POST(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const review = await loadOwnedReview(params.id, user.clinicId);
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reply = await generateReviewReply({
    clinicName: review.clinic.name,
    authorName: review.authorName,
    rating: review.rating,
    text: review.text,
  });

  await prisma.generationUsage.create({
    data: { api: "groq", userId: user.id, clinicId: review.clinicId, costEstimate: 0 },
  });

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { suggestedReply: reply, replyGeneratedAt: new Date() },
  });

  return NextResponse.json({ suggestedReply: updated.suggestedReply });
}

const editSchema = z.object({ reply: z.string().max(2000) });

/** Owner's own edited version of the draft — saved so it persists across visits. */
export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const review = await loadOwnedReview(params.id, user.clinicId);
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { suggestedReply: parsed.data.reply },
  });

  return NextResponse.json({ suggestedReply: updated.suggestedReply });
}
