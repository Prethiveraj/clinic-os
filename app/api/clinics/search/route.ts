import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { searchPlaceByText } from "@/lib/places";
import { issueSearchTicket } from "@/lib/searchTicket";
import { getServerAuthSession } from "@/lib/auth";

const bodySchema = z.object({
  query: z.string().min(2).max(200),
  turnstileToken: z.string().min(1),
});

/**
 * Public, unauthenticated endpoint (requirements §5 step 1-2): search a clinic
 * by name, get an instant growth score. Turnstile + IP rate-limited since this
 * triggers paid Places/PageSpeed calls.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { query, turnstileToken } = parsed.data;

  const ip = getClientIp(req.headers);
  const rate = checkRateLimit(`search:${ip}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many searches. Try again later." }, { status: 429 });
  }

  const humanVerified = await verifyTurnstileToken(turnstileToken, ip);
  if (!humanVerified) {
    return NextResponse.json({ error: "Bot verification failed" }, { status: 400 });
  }

  const session = await getServerAuthSession();
  let result;
  try {
    result = await searchPlaceByText(query);
  } catch (err) {
    // Usually Google Places refusing the key (billing, API not enabled, restrictions).
    console.error("[search] audit failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "We couldn't reach Google to look up that business. Please try again in a few minutes." },
      { status: 502 }
    );
  }

  return NextResponse.json({ candidates: result.map(place => ({
    placeId:place.placeId, name:place.name, address:place.address, category:place.category,
    rating:place.rating, reviewCount:place.userRatingCount, googleMapsUri:place.googleMapsUri,
    ticket:issueSearchTicket(place.placeId),
  })) }, {headers:{'Cache-Control':'no-store'}});
}
