/**
 * Scoring algorithm — requirements.md §7.
 * Four sub-scores (0-100 each), weighted into one overall score.
 * Weights are a defensible starting point, not sacred — retune once real
 * clinic reactions show what correlates with a "yes, this is accurate" response.
 */

export type VisibilityInput = {
  userRatingCount: number | null;
  businessStatus: string | null; // expect "OPERATIONAL"
  hasPhotos: boolean;
  hasRegularOpeningHours: boolean;
  hasWebsiteUri: boolean;
};

export type SiteHealthInput = {
  hasExistingSite: boolean;
  performance: number | null; // 0-1
  seo: number | null; // 0-1
  accessibility: number | null; // 0-1
};

export type ReviewsInput = {
  rating: number | null; // 0-5
  reviewsWithin12moPct: number | null; // 0-100, null if unknown
};

export type ConversionInput = {
  hasPhoneLink: boolean;
  hasBookingMechanism: boolean;
  hasContactForm: boolean;
  hasAboveFoldClickToAction: boolean;
};

export type SubScores = {
  visibility: number;
  siteHealth: number;
  reviews: number;
  conversionReadiness: number;
};

export type ScoreResult = {
  overall: number;
  subScores: SubScores;
};

const WEIGHTS = {
  visibility: 0.25,
  siteHealth: 0.3,
  reviews: 0.2,
  conversionReadiness: 0.25,
} as const;

function ratingCountTier(count: number | null): number {
  const c = count ?? 0;
  if (c === 0) return 0;
  if (c <= 9) return 25;
  if (c <= 49) return 50;
  if (c <= 149) return 75;
  return 100;
}

export function scoreVisibility(input: VisibilityInput): number {
  const tierScore = ratingCountTier(input.userRatingCount);
  const operational = input.businessStatus === "OPERATIONAL" ? 100 : 0;

  const completenessFlags = [input.hasPhotos, input.hasRegularOpeningHours, input.hasWebsiteUri];
  const completenessPct =
    (completenessFlags.filter(Boolean).length / completenessFlags.length) * 100;

  // Average tier score, operational status, and profile completeness.
  return Math.round((tierScore + operational + completenessPct) / 3);
}

export function scoreSiteHealth(input: SiteHealthInput): number {
  if (!input.hasExistingSite) return 0; // hard 0 — biggest fixable gap, should dominate

  const performance = (input.performance ?? 0) * 100;
  const seo = (input.seo ?? 0) * 100;
  const accessibility = (input.accessibility ?? 0) * 100;

  return Math.round(performance * 0.4 + seo * 0.4 + accessibility * 0.2);
}

export function scoreReviews(input: ReviewsInput): number {
  const ratingScore = ((input.rating ?? 0) / 5) * 100;
  if (input.reviewsWithin12moPct == null) {
    return Math.round(ratingScore);
  }
  // Blend static rating with recency — recency matters more for a "growth" score.
  return Math.round(ratingScore * 0.5 + input.reviewsWithin12moPct * 0.5);
}

export function scoreConversionReadiness(input: ConversionInput): number {
  let score = 0;
  if (input.hasPhoneLink) score += 25;
  if (input.hasBookingMechanism) score += 25;
  if (input.hasContactForm) score += 25;
  if (input.hasAboveFoldClickToAction) score += 25;
  return score;
}

export function computeOverallScore(params: {
  visibility: VisibilityInput;
  siteHealth: SiteHealthInput;
  reviews: ReviewsInput;
  conversion: ConversionInput;
}): ScoreResult {
  const subScores: SubScores = {
    visibility: scoreVisibility(params.visibility),
    siteHealth: scoreSiteHealth(params.siteHealth),
    reviews: scoreReviews(params.reviews),
    conversionReadiness: scoreConversionReadiness(params.conversion),
  };

  const overall = Math.round(
    subScores.visibility * WEIGHTS.visibility +
      subScores.siteHealth * WEIGHTS.siteHealth +
      subScores.reviews * WEIGHTS.reviews +
      subScores.conversionReadiness * WEIGHTS.conversionReadiness
  );

  return { overall, subScores };
}
