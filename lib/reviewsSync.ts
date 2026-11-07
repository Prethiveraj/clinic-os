import { prisma } from "@/lib/prisma";
import { getPlaceReviews } from "@/lib/places";

/** v2 §1: pull a clinic's current Google reviews and upsert them, deduped by google_review_id. */
export async function syncClinicReviews(clinicId: string, googlePlaceId: string) {
  const reviews = await getPlaceReviews(googlePlaceId);

  await prisma.generationUsage.create({
    data: { api: "places", clinicId, costEstimate: 0.017 },
  });

  for (const review of reviews) {
    await prisma.review.upsert({
      where: { googleReviewId: review.googleReviewId },
      create: {
        clinicId,
        googleReviewId: review.googleReviewId,
        authorName: review.authorName,
        rating: review.rating,
        text: review.text,
        reviewTime: review.reviewTime,
      },
      update: {
        authorName: review.authorName,
        rating: review.rating,
        text: review.text,
        reviewTime: review.reviewTime,
        fetchedAt: new Date(),
      },
    });
  }

  return reviews.length;
}
