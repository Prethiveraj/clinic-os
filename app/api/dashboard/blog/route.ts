import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { BlogGenerationError, generateBlogDraft, hasActiveSubscription } from "@/lib/blog";

/** Owner asks for a new draft now, instead of waiting for the weekly job. The draft still needs approval. */
export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!user.clinicId) return NextResponse.json({ error: "No clinic on this account" }, { status: 400 });

  // Blog posts are an ongoing paid-plan feature (each draft is a Groq AI call).
  if (!(await hasActiveSubscription(user.clinicId))) {
    return NextResponse.json({ error: "Blog posts are included with an active subscription." }, { status: 402 });
  }

  const rate = checkRateLimit(`blog-generate:${user.clinicId}`, 3, 24 * 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "You can generate up to 3 drafts a day. Try again tomorrow." }, { status: 429 });
  }

  try {
    const post = await generateBlogDraft(user.clinicId, { userId: user.id });
    return NextResponse.json({ post: { id: post.id, title: post.title, status: post.status } });
  } catch (err) {
    if (err instanceof BlogGenerationError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[blog] generation failed", err);
    return NextResponse.json({ error: "Couldn't generate a draft right now. Please try again." }, { status: 502 });
  }
}
