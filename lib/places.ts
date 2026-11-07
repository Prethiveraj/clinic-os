/**
 * Google Places API (New) client.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-search
 */

import { requireEnv } from "@/lib/env";

const PLACES_BASE = "https://places.googleapis.com/v1";

export type PlaceSearchResult = {
  placeId: string;
  name: string;
  address: string;
  category: string | null;
  phone: string | null;
  websiteUri: string | null;
  rating: number | null;
  userRatingCount: number | null;
  businessStatus: string | null;
  hours: unknown;
  photos: string[];
  editorialSummary: string | null;
  googleMapsUri?: string;
};

const requireKey = () => requireEnv("GOOGLE_PLACES_API_KEY");

const FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "primaryTypeDisplayName",
  "types",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "businessStatus",
  "regularOpeningHours",
  "currentOpeningHours",
  "photos",
  "googleMapsUri",
].join(",");

/** Text Search — used for the public "search a clinic by name" flow. */
export async function searchPlaceByText(query: string): Promise<PlaceSearchResult[]> {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": requireKey(),
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
  });

  if (!res.ok) {
    throw new Error(`Places search failed (${res.status}). Check API access, restrictions and quota.`);
  }

  const data = await res.json();
  const places = (data.places ?? []) as any[];

  return places.map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    category: p.primaryTypeDisplayName?.text ?? p.types?.[0] ?? null,
    phone: p.nationalPhoneNumber ?? null,
    websiteUri: p.websiteUri ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    businessStatus: p.businessStatus ?? null,
    hours: p.regularOpeningHours ?? p.currentOpeningHours ?? null,
    photos: (p.photos ?? []).slice(0, 6).map((ph: any) => ph.name as string),
    editorialSummary: null,
    googleMapsUri: p.googleMapsUri,
  }));
}

/** Resolves a Places photo resource name to a fetchable image URL (proxied through our API key). */
export function placePhotoUrl(_photoResourceName: string, _maxWidthPx = 800): string {
  throw new Error("Google photos must not be mirrored or exposed with an API key. Use owner-uploaded assets.");
}

export async function getPlaceDetails(placeId: string): Promise<PlaceSearchResult> {
  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "X-Goog-Api-Key": requireKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });

  if (!res.ok) {
    throw new Error(`Place details failed (${res.status}). Check API access and quota.`);
  }

  const p = await res.json();
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    category: p.primaryTypeDisplayName?.text ?? p.types?.[0] ?? null,
    phone: p.nationalPhoneNumber ?? null,
    websiteUri: p.websiteUri ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    businessStatus: p.businessStatus ?? null,
    hours: p.regularOpeningHours ?? p.currentOpeningHours ?? null,
    photos: (p.photos ?? []).slice(0, 6).map((ph: any) => ph.name as string),
    editorialSummary: null,
    googleMapsUri: p.googleMapsUri,
  };
}

export type PlaceReview = {
  googleReviewId: string;
  authorName: string;
  rating: number;
  text: string | null;
  reviewTime: Date;
};

/**
 * v2 §1 (reputation management) — Places API (New) returns up to 5 most
 * relevant reviews on the `reviews` field of Place Details. There's no
 * paginated "all reviews" endpoint; this is the full set Google exposes.
 */
export async function getPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "X-Goog-Api-Key": requireKey(),
      "X-Goog-FieldMask": "reviews",
    },
  });

  if (!res.ok) {
    throw new Error(`Place reviews fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const reviews = (data.reviews ?? []) as any[];

  return reviews.map((r) => ({
    googleReviewId: r.name as string,
    authorName: r.authorAttribution?.displayName ?? "Anonymous",
    rating: typeof r.rating === "number" ? r.rating : 0,
    text: r.text?.text ?? null,
    reviewTime: new Date(r.publishTime),
  }));
}
