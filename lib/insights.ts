export type Insight = {
  kind: "strength" | "opportunity";
  impact: "High" | "Medium" | "Low";
  title: string;
  description: string;
  icon: "globe" | "phone" | "camera" | "star" | "users" | "clock";
};

/**
 * Turns the real computed signals (sub-scores + the underlying booleans
 * that fed them) into specific, readable findings — not hardcoded per
 * business, so this reads sensibly for any clinic, chess academy, salon,
 * or anything else the search resolves to, demo data or real API data
 * alike.
 */
export function generateInsights(input: {
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  hasPhotos: boolean;
  hasExistingSite: boolean;
  conversion: {
    hasPhoneLink: boolean;
    hasBookingMechanism: boolean;
    hasContactForm: boolean;
    hasAboveFoldClickToAction: boolean;
  };
}): Insight[] {
  const insights: Insight[] = [];
  const category = input.category?.toLowerCase() ?? "business";

  if (!input.hasExistingSite) {
    insights.push({
      kind: "opportunity",
      impact: "High",
      icon: "globe",
      title: "No website found",
      description: `Most people searching for a ${category} nearby check for a website before calling — without one, you're relying entirely on word of mouth and the Google listing alone.`,
    });
    insights.push({
      kind: "opportunity",
      impact: "High",
      icon: "phone",
      title: "No way to book or enquire online",
      description: "There's no contact form, booking link, or click-to-call button anywhere online — every lead has to find your number and call during open hours.",
    });
  } else {
    const missing: string[] = [];
    if (!input.conversion.hasPhoneLink) missing.push("a click-to-call number");
    if (!input.conversion.hasBookingMechanism) missing.push("a booking link");
    if (!input.conversion.hasContactForm) missing.push("a contact form");
    if (missing.length > 0) {
      insights.push({
        kind: "opportunity",
        impact: "Medium",
        icon: "phone",
        title: "Your website is missing easy ways to get in touch",
        description: `Visitors to your site can't find ${missing.join(" or ")} — each one is a visitor who leaves without converting.`,
      });
    } else {
      insights.push({
        kind: "strength",
        impact: "Low",
        icon: "phone",
        title: "Your website makes it easy to get in touch",
        description: "Click-to-call, booking, and a contact form are all present — visitors have a clear path to reach you.",
      });
    }
  }

  if (!input.hasPhotos) {
    insights.push({
      kind: "opportunity",
      impact: "Medium",
      icon: "camera",
      title: "No photos on your Google profile",
      description: "Listings with photos consistently get more views and clicks in local search results than listings without any.",
    });
  } else {
    insights.push({
      kind: "strength",
      impact: "Low",
      icon: "camera",
      title: "Your profile has photos",
      description: "Visual proof helps people choose you over a listing with no photos at all.",
    });
  }

  if (input.rating != null) {
    if (input.rating >= 4.0) {
      insights.push({
        kind: "strength",
        impact: "Low",
        icon: "star",
        title: `A ${input.rating.toFixed(1)}★ rating is a real asset`,
        description: "Once someone finds your listing, this rating does a lot of the convincing for you — the gap is getting found in the first place.",
      });
    } else {
      insights.push({
        kind: "opportunity",
        impact: "Medium",
        icon: "star",
        title: "Rating has room to grow",
        description: `A ${input.rating.toFixed(1)}★ average is below what most people filter for when comparing nearby options.`,
      });
    }
  }

  const reviewCount = input.reviewCount ?? 0;
  if (reviewCount < 50) {
    insights.push({
      kind: "opportunity",
      impact: "Low",
      icon: "users",
      title: "Review volume is still building",
      description: `${reviewCount} review${reviewCount === 1 ? "" : "s"} so far — more reviews signal trust to people who haven't visited yet and are comparing options.`,
    });
  } else {
    insights.push({
      kind: "strength",
      impact: "Low",
      icon: "users",
      title: "Strong review volume",
      description: `${reviewCount} reviews is a solid trust signal compared to most nearby listings.`,
    });
  }

  return insights;
}
