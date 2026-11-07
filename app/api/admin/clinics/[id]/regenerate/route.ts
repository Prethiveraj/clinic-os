import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { generateSiteContent } from "@/lib/ai";
import { extractCity, formatOpeningHours } from "@/lib/clinicIngest";

/** Requirements §11: manually trigger regeneration for any clinic (bypasses the subscriber gate — admin action). */
export async function POST(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clinic = await prisma.clinic.findUnique({ where: { id: params.id }, include:{siteContent:true} });
  if (!clinic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!clinic.siteContent) return NextResponse.json({error:"The owner must confirm clinic facts before initial generation."},{status:400});

  const generated = await generateSiteContent({
    name: clinic.name,
    category: clinic.category ?? "Clinic",
    address: clinic.address ?? "",
    city: extractCity(clinic.address ?? ""),
    formattedOpeningHours: formatOpeningHours(clinic.hours),
    rating: null,
    userRatingCount: null,
    editorialSummary: null,
    servicesListOrNone: Array.isArray(clinic.siteContent.services)?(clinic.siteContent.services as string[]).join(";")||"none":"none",
  });

  await prisma.generationUsage.create({
    data: { api: "groq", userId: admin.id, clinicId: clinic.id, costEstimate: 0 },
  });

  await prisma.siteContent.upsert({
    where: { clinicId: clinic.id },
    create: {
      clinicId: clinic.id,
      headline: generated.content.headline,
      aboutCopy: generated.content.about_copy,
      services: generated.content.services,
      seoMeta: generated.content.seo_meta,
      jsonLd: generated.content.json_ld as any,
      promptVersion: generated.promptVersion,
    },
    update: {
      headline: generated.content.headline,
      aboutCopy: generated.content.about_copy,
      services: generated.content.services,
      seoMeta: generated.content.seo_meta,
      jsonLd: generated.content.json_ld as any,
      promptVersion: generated.promptVersion,
      generatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, content: generated.content });
}
