import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook — requirements §5 step 6 & §10: drives subscription status,
 * which in turn drives site_settings.status (watermark on/off).
 * Docs: https://razorpay.com/docs/webhooks/
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event as string;
  const subscriptionEntity = event.payload?.subscription?.entity;
  const razorpaySubscriptionId: string | undefined = subscriptionEntity?.id;

  if (!razorpaySubscriptionId) {
    // Not a subscription-scoped event we handle (e.g. a bare payment event) — ack and ignore.
    return NextResponse.json({ ok: true });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId },
  });
  if (!subscription) {
    return NextResponse.json({ ok: true }); // unknown subscription — nothing to reconcile
  }

  switch (eventType) {
    case "subscription.activated":
    case "subscription.charged": {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          currentPeriodEnd: subscriptionEntity.current_end
            ? new Date(subscriptionEntity.current_end * 1000)
            : undefined,
        },
      });
      await prisma.siteSettings.update({
        where: { clinicId: subscription.clinicId },
        data: { status: "live" },
      });
      await prisma.clinic.update({ where: { id: subscription.clinicId }, data: { status: "live" } });
      break;
    }

    case "subscription.pending":
    case "subscription.halted":
    case "payment.failed": {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "past_due" },
      });
      // Falls back to watermarked demo state rather than going dark, per requirements §5 step 10.
      await prisma.siteSettings.update({
        where: { clinicId: subscription.clinicId },
        data: { status: "draft" },
      });
      break;
    }

    case "subscription.cancelled": {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "cancelled" },
      });
      // Site stays live but watermarked — reactivation is a status flip, not a rebuild.
      await prisma.siteSettings.update({
        where: { clinicId: subscription.clinicId },
        data: { status: "draft" },
      });
      await prisma.clinic.update({ where: { id: subscription.clinicId }, data: { status: "churned" } });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
