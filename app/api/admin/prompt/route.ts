import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PROMPT_TEMPLATE_KEY, resolveActivePrompt } from "@/lib/ai";

/** Requirements §11: edit the global prompt template without a code deploy. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const active = await resolveActivePrompt();
  return NextResponse.json(active);
}

const bodySchema = z.object({
  systemPrompt: z.string().min(10),
  version: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const updated = await prisma.promptTemplate.upsert({
    where: { key: PROMPT_TEMPLATE_KEY },
    create: {
      key: PROMPT_TEMPLATE_KEY,
      content: parsed.data.systemPrompt,
      version: parsed.data.version,
      updatedBy: admin.id,
    },
    update: {
      content: parsed.data.systemPrompt,
      version: parsed.data.version,
      updatedBy: admin.id,
    },
  });

  return NextResponse.json({ ok: true, version: updated.version });
}
