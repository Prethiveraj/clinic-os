import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OtpDeliveryError, sendOtp } from "@/lib/otp";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  turnstileToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const { email, turnstileToken } = parsed.data;

  const ip = getClientIp(req.headers);
  const rate = checkRateLimit(`otp:${ip}`, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  if (!(await verifyTurnstileToken(turnstileToken, ip))) {
    return NextResponse.json({ error: "Bot verification failed. Please try again." }, { status: 400 });
  }

  try {
    await sendOtp(email);
  } catch (err) {
    if (err instanceof OtpDeliveryError) {
      return NextResponse.json({ error: "We couldn't send the email. Please try again shortly." }, { status: 502 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
