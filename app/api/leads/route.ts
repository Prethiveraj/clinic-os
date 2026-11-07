import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  clinicId: z.string(),
  name: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
  source: z.enum(["contact_form", "click_to_call", "whatsapp"]),
});

/** Requirements §5 step 8 — every contact-form/click-to-call/WhatsApp interaction on a live site. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rate = checkRateLimit(`leads:${ip}`, 20, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const clinic = await prisma.clinic.findUnique({ where: { id: parsed.data.clinicId } });
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const lead = await prisma.lead.create({
    data: {
      clinicId: clinic.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      message: parsed.data.message,
      source: parsed.data.source,
    },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
