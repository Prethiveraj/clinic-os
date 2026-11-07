import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rejectUnlessCron } from "@/lib/cronAuth";
import { BlogGenerationError, generateBlogDraft } from "@/lib/blog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DRAFT_INTERVAL_DAYS = 7;
const MAX_CLINICS_PER_RUN = 10;

/**
 * Runs daily; each clinic gets at most one new draft per week. Drafts always
 * wait for owner approval, and a clinic with an unreviewed draft is skipped
 * so drafts don't pile up unread.
 */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessCron(req);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - DRAFT_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  const clinics = await prisma.clinic.findMany({
    where: {
      subscriptions: { some: { status: "active" } },
      siteSettings: { is: { blogAutoGenerate: true } },
      siteContent: { isNot: null },
      blogPosts: { none: { OR: [{ status: "pending_approval" }, { generatedAt: { gte: cutoff } }] } },
    },
    select: { id: true, name: true },
    take: MAX_CLINICS_PER_RUN,
  });

  const results: { clinic: string; outcome: string }[] = [];
  for (const clinic of clinics) {
    try {
      const post = await generateBlogDraft(clinic.id, { userId: null });
      results.push({ clinic: clinic.name, outcome: `drafted "${post.title}"` });
    } catch (err) {
      const reason = err instanceof BlogGenerationError ? err.message : "generation failed";
      if (!(err instanceof BlogGenerationError)) console.error(`[cron/blog-drafts] ${clinic.id}`, err);
      results.push({ clinic: clinic.name, outcome: `skipped: ${reason}` });
    }
  }

  return NextResponse.json({ eligible: clinics.length, results });
}
