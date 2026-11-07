import Razorpay from "razorpay";
import crypto from "crypto";
import { requireEnv } from "@/lib/env";

let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (!client) {
    client = new Razorpay({ key_id: requireEnv("RAZORPAY_KEY_ID"), key_secret: requireEnv("RAZORPAY_KEY_SECRET") });
  }
  return client;
}

export type PlanTier = "starter" | "growth";

/** Plan IDs must be created in the Razorpay dashboard ahead of time and mapped here. */
export const PLAN_ID_BY_TIER: Record<PlanTier, string | undefined> = {
  starter: process.env.RAZORPAY_PLAN_STARTER,
  growth: process.env.RAZORPAY_PLAN_GROWTH,
};

export async function createSubscription(params: {
  planTier: PlanTier;
  customerNotifyEmail?: string;
  totalCount?: number; // billing cycles, e.g. 12 for a 12-month commitment
}) {
  const razorpay = getRazorpayClient();
  const planId = PLAN_ID_BY_TIER[params.planTier];
  if (!planId) throw new Error(`No Razorpay plan configured for tier "${params.planTier}"`);

  return razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    total_count: params.totalCount ?? 120, // effectively "until cancelled" for a monthly plan
  });
}

/** Verifies the `X-Razorpay-Signature` header on incoming webhooks. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = requireEnv("RAZORPAY_WEBHOOK_SECRET");

  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  // timingSafeEqual throws on different lengths; a wrong-length signature is simply invalid.
  return given.length === expected.length && crypto.timingSafeEqual(expected, given);
}
