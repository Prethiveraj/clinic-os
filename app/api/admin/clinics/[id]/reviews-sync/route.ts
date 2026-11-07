import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { syncClinicReviews } from "@/lib/reviewsSync";

/** v2 §1, admin-triggered version of requirements §11's "manually trigger" pattern. */
export async function POST(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clinic = await prisma.clinic.findUnique({ where: { id: params.id } });
  if (!clinic) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!clinic.googlePlaceId) {
    return NextResponse.json({ error: "Clinic has no linked Google Place" }, { status: 400 });
  }

  const count = await syncClinicReviews(clinic.id, clinic.googlePlaceId);
  return NextResponse.json({ ok: true, count });
}
