import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const bodySchema = z.object({
  gaMeasurementId: z.string().max(50).nullable().optional(),
  gscVerificationMethod: z.enum(["meta", "dns_txt"]).nullable().optional(),
  gscVerificationValue: z.string().max(500).nullable().optional(),
  customHeaderScripts: z.string().max(20000).nullable().optional(),
  customBodyScripts: z.string().max(20000).nullable().optional(),
  blogAutoGenerate: z.boolean().optional(),
  photoRemindersEnabled: z.boolean().optional(),
});

/**
 * Requirements §9: only the clinic's own authenticated owner (or admin) may write
 * custom_header_scripts / custom_body_scripts — these render verbatim into the
 * public site, so write access itself is the security boundary, not escaping.
 */
export async function PUT(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId && user.role !== "admin") {
    return NextResponse.json({ error: "No clinic on this account" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const clinicId = user.clinicId!;

  const updated = await prisma.siteSettings.update({
    where: { clinicId },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, settings: updated });
}
