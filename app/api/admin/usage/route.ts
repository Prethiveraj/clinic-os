import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** Requirements §11: view generation_usage for API cost visibility. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const usage = await prisma.generationUsage.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { clinic: { select: { name: true, slug: true } } },
  });

  const totals = usage.reduce<Record<string, number>>((acc, row) => {
    acc[row.api] = (acc[row.api] ?? 0) + row.costEstimate;
    return acc;
  }, {});

  return NextResponse.json({ usage, totals });
}
