import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { runHealthCheckAndScore } from "@/lib/clinicIngest";
import { getPlaceDetails } from "@/lib/places";

/** Latest score for a clinic. Public — the score is the hook, per requirements §5 step 2. */
export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const score = await prisma.score.findFirst({
    where: { clinicId: params.id },
    orderBy: { computedAt: "desc" },
  });

  if (!score) return NextResponse.json({ error: "No score yet" }, { status: 404 });

  return NextResponse.json({ overall: score.overallScore, subScores: score.subScores, computedAt: score.computedAt });
}

/** Admin-triggered rescan (requirements §11: "manually trigger... a score refresh for any clinic"). */
export async function POST(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clinic = await prisma.clinic.findUnique({ where: { id: params.id } });
  if (!clinic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!clinic.googlePlaceId) return NextResponse.json({error:"This clinic has no Google place ID."},{status:400});
  let details;
  try { details = await getPlaceDetails(clinic.googlePlaceId); }
  catch { return NextResponse.json({error:"Google details could not be refreshed. The previous score was kept."},{status:502}); }
  const result = await runHealthCheckAndScore(clinic.id, details.websiteUri, {
    userRatingCount: details.userRatingCount,
    businessStatus: details.businessStatus,
    hasPhotos: details.photos.length > 0,
    hasRegularOpeningHours: !!details.hours,
    hasWebsiteUri: !!details.websiteUri,
    rating: details.rating,
  });

  return NextResponse.json({ overall: result.score.overallScore, subScores: result.subScores });
}
