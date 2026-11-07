import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ patients: [] });

  const patients = await prisma.patient.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ patients });
}
