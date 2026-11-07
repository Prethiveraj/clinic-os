import { prisma } from "@/lib/prisma";
import { generateClinicSlug } from "@/lib/slug";
import { searchPlaceByText, type PlaceSearchResult } from "@/lib/places";
import { getPageSpeedScores } from "@/lib/pagespeed";
import { checkRobotsAndIndexability, checkConversionReadiness } from "@/lib/siteHealth";
import { computeOverallScore } from "@/lib/scoring";


function formatOpeningHours(hours: unknown): string {
  const weekdayText = (hours as any)?.weekdayDescriptions as string[] | undefined;
  return weekdayText?.join("; ") ?? "Not listed";
}

function extractCity(address: string): string {
  const parts = address.split(",").map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 3] ?? parts[0] : address;
}

async function logUsage(api: "places" | "pagespeed" | "groq", clinicId: string | null, userId: string | null, cost: number) {
  await prisma.generationUsage.create({
    data: { api, clinicId, userId, costEstimate: cost },
  });
}

/** Step 1-2 of the customer journey: search Places, upsert clinic, run health check + score. */
export async function ingestClinicByQuery(query: string, userId: string | null) {
  const results = await searchPlaceByText(query);
  if (results.length === 0) return null;

  const top = results[0];
  return ingestClinicFromPlace(top, userId);
}

export async function ingestClinicFromPlace(place: PlaceSearchResult, userId: string | null) {
  let clinic = await prisma.clinic.findUnique({ where: { googlePlaceId: place.placeId } });

  // Google photos are not mirrored. Owner-uploaded photos remain in clinic.photos.
  const photoUrls: string[] = [];

  // Discovery is transient: persist the exempt place ID and our audit, not a copy
  // of the Google business listing. Website facts are saved only from the owner's
  // independently confirmed form during generation.
  if (!clinic) {
    const slug = await generateClinicSlug("clinic-" + place.placeId.slice(-10));
    clinic = await prisma.clinic.create({ data: { slug, name: "Unclaimed clinic", googlePlaceId: place.placeId, photos: [] } });
  }

  await logUsage("places", clinic.id, userId, 0.017); // approximate per-call cost, tune from real billing

  const scoreResult = await runHealthCheckAndScore(clinic.id, place.websiteUri, {
    userRatingCount: place.userRatingCount,
    businessStatus: place.businessStatus,
    hasPhotos: photoUrls.length > 0 || (place.photos?.length ?? 0) > 0,
    hasRegularOpeningHours: !!place.hours,
    hasWebsiteUri: !!place.websiteUri,
    rating: place.rating,
  });

  return { clinic, place, ...scoreResult };
}

export async function runHealthCheckAndScore(
  clinicId: string,
  existingSiteUrl: string | null,
  visibility: {
    userRatingCount: number | null;
    businessStatus: string | null;
    hasPhotos: boolean;
    hasRegularOpeningHours: boolean;
    hasWebsiteUri: boolean;
    rating: number | null;
  }
) {
  const hasExistingSite = !!existingSiteUrl;

  let performance: number | null = null;
  let seo: number | null = null;
  let accessibility: number | null = null;
  let isIndexed: boolean | null = null;
  let conversion = {
    hasPhoneLink: false,
    hasBookingMechanism: false,
    hasContactForm: false,
    hasAboveFoldClickToAction: false,
  };

  if (hasExistingSite && existingSiteUrl) {
    try {
      const psi = await getPageSpeedScores(existingSiteUrl);
      performance = psi.performance;
      seo = psi.seo;
      accessibility = psi.accessibility;
      await prisma.generationUsage.create({
        data: { api: "pagespeed", clinicId, costEstimate: 0 },
      });
    } catch (err) {
      // PageSpeed can legitimately fail (site down, blocked) — health score just stays partial.
      console.error("[pagespeed]", err instanceof Error ? err.message : err);
    }

    try {
      const crawl = await checkRobotsAndIndexability(existingSiteUrl);
      isIndexed = crawl.likelyCrawlable;
    } catch {
      isIndexed = null;
    }

    try {
      conversion = await checkConversionReadiness(existingSiteUrl);
    } catch {
      // leave defaults (all false)
    }
  }

  await prisma.siteHealthCheck.create({
    data: {
      clinicId,
      hasExistingSite,
      existingSiteUrl: null,
      mobileFriendly: performance != null ? performance >= 0.5 : null,
      loadSpeedScore: performance != null ? Math.round(performance * 100) : null,
      isIndexed,
      conversionChecks: conversion as any,
    },
  });

  const { overall, subScores } = computeOverallScore({
    visibility: {
      userRatingCount: visibility.userRatingCount,
      businessStatus: visibility.businessStatus,
      hasPhotos: visibility.hasPhotos,
      hasRegularOpeningHours: visibility.hasRegularOpeningHours,
      hasWebsiteUri: visibility.hasWebsiteUri,
    },
    siteHealth: { hasExistingSite, performance, seo, accessibility },
    reviews: { rating: visibility.rating, reviewsWithin12moPct: null },
    conversion,
  });

  const score = await prisma.score.create({
    data: {
      clinicId,
      overallScore: overall,
      subScores: subScores as any,
    },
  });

  return { score, subScores };
}

export { formatOpeningHours, extractCity };
