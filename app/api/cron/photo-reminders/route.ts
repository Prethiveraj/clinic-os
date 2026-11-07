import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cronAuth";
import { sendWeeklyPhotoReminders } from "@/lib/photoReminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Safe to run daily: each owner still gets the reminder only once per week. */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessCron(req);
  if (denied) return denied;
  return NextResponse.json(await sendWeeklyPhotoReminders());
}
