import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReviewInbox from "@/components/ReviewInbox";

export default async function ReviewsPage() {
  const user = await requireUser();
  if (!user.clinicId) return <p className="text-slate-500">No clinic on this account yet.</p>;

  const [clinic, reviews] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: user.clinicId } }),
    prisma.review.findMany({ where: { clinicId: user.clinicId }, orderBy: { reviewTime: "desc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="mt-2 text-slate-600">
        Your recent Google reviews, with an AI-drafted reply for each — edit it, then copy it over to
        Google yourself. Nothing is posted automatically.
      </p>
      <div className="mt-6">
        <ReviewInbox
          hasGooglePlace={!!clinic?.googlePlaceId}
          initialReviews={reviews.map((r) => ({
            id: r.id,
            authorName: r.authorName,
            rating: r.rating,
            text: r.text,
            reviewTime: r.reviewTime.toISOString(),
            suggestedReply: r.suggestedReply,
          }))}
        />
      </div>
    </div>
  );
}
