import { test } from "node:test";
import assert from "node:assert/strict";
import { computeOverallScore, scoreConversionReadiness, scoreReviews, scoreSiteHealth, scoreVisibility } from "@/lib/scoring";

test("visibility averages count tier, operational status and completeness", () => {
  assert.equal(
    scoreVisibility({ userRatingCount: 87, businessStatus: "OPERATIONAL", hasPhotos: true, hasRegularOpeningHours: true, hasWebsiteUri: false }),
    81
  );
  assert.equal(scoreVisibility({ userRatingCount: 0, businessStatus: null, hasPhotos: false, hasRegularOpeningHours: false, hasWebsiteUri: false }), 0);
  assert.equal(scoreVisibility({ userRatingCount: 150, businessStatus: "OPERATIONAL", hasPhotos: true, hasRegularOpeningHours: true, hasWebsiteUri: true }), 100);
});

test("site health is a hard zero without a site, else weighted Lighthouse scores", () => {
  assert.equal(scoreSiteHealth({ hasExistingSite: false, performance: 1, seo: 1, accessibility: 1 }), 0);
  assert.equal(scoreSiteHealth({ hasExistingSite: true, performance: 0.5, seo: 1, accessibility: 0.8 }), 76);
});

test("reviews blend rating with recency only when recency is known", () => {
  assert.equal(scoreReviews({ rating: 4.6, reviewsWithin12moPct: null }), 92);
  assert.equal(scoreReviews({ rating: 4, reviewsWithin12moPct: 50 }), 65);
});

test("conversion readiness adds 25 per signal", () => {
  assert.equal(scoreConversionReadiness({ hasPhoneLink: true, hasBookingMechanism: false, hasContactForm: true, hasAboveFoldClickToAction: false }), 50);
});

test("overall score uses the 25/30/20/25 weights (report worked example = 39)", () => {
  const { overall } = computeOverallScore({
    visibility: { userRatingCount: 87, businessStatus: "OPERATIONAL", hasPhotos: true, hasRegularOpeningHours: true, hasWebsiteUri: false },
    siteHealth: { hasExistingSite: false, performance: null, seo: null, accessibility: null },
    reviews: { rating: 4.6, reviewsWithin12moPct: null },
    conversion: { hasPhoneLink: false, hasBookingMechanism: false, hasContactForm: false, hasAboveFoldClickToAction: false },
  });
  assert.equal(overall, 39);
});
