import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** v2 §3 (minimal retention): owner manually marks a lead as converted into a patient. */
export async function POST(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead || lead.clinicId !== user.clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patient = await prisma.patient.upsert({
    where: { leadId: lead.id },
    create: {
      clinicId: lead.clinicId,
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
    },
    update: {},
  });

  return NextResponse.json({ patient });
}
