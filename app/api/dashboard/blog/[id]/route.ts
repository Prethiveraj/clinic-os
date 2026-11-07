import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

async function loadOwnedPost(postId: string) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  // Approval belongs to the clinic's owner, so only that clinic's own account may act on its posts.
  if (!post || !user.clinicId || post.clinicId !== user.clinicId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { user, post };
}

const editSchema = z.object({
  title: z.string().trim().min(5).max(120),
  metaDescription: z.string().trim().min(10).max(200),
  intro: z.string().trim().min(1).max(5000),
  sections: z
    .array(z.object({ heading: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(8000) }))
    .min(1)
    .max(12),
  faq: z
    .array(z.object({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(2000) }))
    .max(15),
});

/** Owner's edits to a draft (or to a live post). */
export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const loaded = await loadOwnedPost(params.id);
  if ("error" in loaded) return loaded.error;

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });

  const updated = await prisma.blogPost.update({ where: { id: loaded.post.id }, data: parsed.data });
  return NextResponse.json({ post: updated });
}

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "unpublish"]),
  note: z.string().max(500).optional(),
});

/** The only way a post reaches the public site is the owner's explicit "approve" here. */
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const loaded = await loadOwnedPost(params.id);
  if ("error" in loaded) return loaded.error;
  const { user, post } = loaded;

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const now = new Date();
  const reviewed = { reviewedAt: now, reviewedBy: user.id };

  if (parsed.data.action === "approve") {
    if (post.status === "published") return NextResponse.json({ post });
    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: { ...reviewed, status: "published", publishedAt: post.publishedAt ?? now, rejectionNote: null },
    });
    return NextResponse.json({ post: updated });
  }

  if (parsed.data.action === "reject") {
    if (post.status !== "pending_approval") {
      return NextResponse.json({ error: "Only drafts awaiting approval can be rejected." }, { status: 409 });
    }
    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: { ...reviewed, status: "rejected", rejectionNote: parsed.data.note ?? null },
    });
    return NextResponse.json({ post: updated });
  }

  if (post.status !== "published") {
    return NextResponse.json({ error: "This post isn't live." }, { status: 409 });
  }
  const updated = await prisma.blogPost.update({
    where: { id: post.id },
    data: { ...reviewed, status: "pending_approval" },
  });
  return NextResponse.json({ post: updated });
}
