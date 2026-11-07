import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { syncClinicReviews } from "@/lib/reviewsSync";

/** v2 §1: owner-triggered pull of their clinic's current Google reviews. */
export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ error: "No clinic on this account" }, { status: 400 });

  const clinic = await prisma.clinic.findUnique({ where: { id: user.clinicId } });
  if (!clinic?.googlePlaceId) {
    return NextResponse.json({ error: "Clinic has no linked Google Place yet" }, { status: 400 });
  }

  const count = await syncClinicReviews(clinic.id, clinic.googlePlaceId);
  return NextResponse.json({ ok: true, count });
}
