import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Scheduled-job endpoints must not be callable by the public. Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set;
 * on a VPS, the crontab curl sends the same header. No secret configured
 * means the endpoint stays closed rather than open.
 */
export function rejectUnlessCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });

  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
