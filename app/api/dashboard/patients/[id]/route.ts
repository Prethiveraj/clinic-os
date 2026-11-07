import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const bodySchema = z.object({
  lastVisitDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** v2 §3: owner manually updates last_visit_date themselves — no booking-system integration. */
export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!patient || patient.clinicId !== user.clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const updated = await prisma.patient.update({
    where: { id: patient.id },
    data: {
      ...(parsed.data.lastVisitDate !== undefined
        ? { lastVisitDate: parsed.data.lastVisitDate ? new Date(parsed.data.lastVisitDate) : null }
        : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  });

  return NextResponse.json({ patient: updated });
}
