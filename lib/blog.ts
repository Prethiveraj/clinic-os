import type { BlogPost } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { researchKeywords, type KeywordResearch } from "@/lib/keywordResearch";
import { generateBlogPost } from "@/lib/ai";
import { generateUniqueSlug } from "@/lib/slug";
import { appUrl, sendEmail } from "@/lib/email";
import { notifyOnce } from "@/lib/notify";

export type BlogSection = { heading: string; body: string };
export type BlogFaq = { question: string; answer: string };

const STOPWORDS = new Set(["in", "near", "cost", "the", "a", "an", "of", "for", "and", "to", "best", "clinic"]);
const QUESTIONS_PER_POST = 5;

export class BlogGenerationError extends Error {}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function topicWords(keyword: string, research: KeywordResearch): string[] {
  const locationWords = new Set(normalize(`${research.area ?? ""} ${research.city ?? ""}`).split(" "));
  return normalize(keyword)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !locationWords.has(w));
}

/**
 * Picks the next unused target keyword (location keywords come first, so the
 * earliest posts target "<service> in <area>" style searches), plus the
 * unused search questions most related to it.
 */
export function pickTopic(
  research: KeywordResearch,
  used: { keywords: Set<string>; questions: Set<string> }
): { targetKeyword: string; supportingKeywords: string[]; questions: string[] } | null {
  const targetKeyword = research.keywords.find((k) => !used.keywords.has(normalize(k)));
  if (!targetKeyword) return null;

  const freshQuestions = research.questions.filter((q) => !used.questions.has(normalize(q)));
  if (freshQuestions.length === 0) return null;

  const words = topicWords(targetKeyword, research);
  const related = freshQuestions.filter((q) => words.some((w) => normalize(q).includes(w)));
  const questions = [...related, ...freshQuestions.filter((q) => !related.includes(q))].slice(0, QUESTIONS_PER_POST);

  const supportingKeywords = research.keywords
    .filter((k) => k !== targetKeyword && words.some((w) => normalize(k).includes(w)))
    .slice(0, 6);

  return { targetKeyword, supportingKeywords, questions };
}

export async function hasActiveSubscription(clinicId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({ where: { clinicId, status: "active" } });
  return !!sub;
}

/**
 * Researches keywords, drafts one post with AI, and saves it as
 * pending_approval. It is never published here — only the owner's explicit
 * approval (api/dashboard/blog/[id]) flips a post to published.
 */
export async function generateBlogDraft(clinicId: string, opts: { userId: string | null }): Promise<BlogPost> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    include: {
      siteContent: true,
      blogPosts: { select: { targetKeyword: true, sourceQuestions: true, title: true } },
    },
  });
  if (!clinic) throw new BlogGenerationError("Clinic not found");

  const services = Array.isArray(clinic.siteContent?.services) ? (clinic.siteContent!.services as string[]) : [];
  const research = await researchKeywords({ category: clinic.category, services, address: clinic.address });

  const used = {
    keywords: new Set(clinic.blogPosts.map((p) => normalize(p.targetKeyword))),
    questions: new Set(
      clinic.blogPosts.flatMap((p) => (Array.isArray(p.sourceQuestions) ? (p.sourceQuestions as string[]) : [])).map(normalize)
    ),
  };
  const topic = pickTopic(research, used);
  if (!topic) {
    throw new BlogGenerationError(
      "Every keyword found for this clinic already has a post. Add more services to the site to open up new topics."
    );
  }

  const { post, promptVersion } = await generateBlogPost({
    clinicName: clinic.name,
    category: clinic.category ?? "clinic",
    area: research.area,
    city: research.city,
    services,
    targetKeyword: topic.targetKeyword,
    supportingKeywords: topic.supportingKeywords,
    questions: topic.questions,
    existingTitles: clinic.blogPosts.map((p) => p.title),
  });

  const slug = await generateUniqueSlug(post.slug || post.title, async (candidate) => {
    const found = await prisma.blogPost.findUnique({ where: { clinicId_slug: { clinicId, slug: candidate } } });
    return !!found;
  });

  const created = await prisma.blogPost.create({
    data: {
      clinicId,
      slug,
      title: post.title,
      metaDescription: post.meta_description,
      targetKeyword: topic.targetKeyword,
      keywords: topic.supportingKeywords,
      sourceQuestions: topic.questions,
      keywordSource: research.source,
      intro: post.intro,
      sections: post.sections,
      faq: post.faq,
      promptVersion,
      status: "pending_approval",
    },
  });

  await prisma.generationUsage.create({
    data: { api: "groq", userId: opts.userId, clinicId, costEstimate: 0 },
  });

  await notifyOwnersOfDraft(created, clinic.name);
  return created;
}

async function notifyOwnersOfDraft(post: BlogPost, clinicName: string): Promise<void> {
  const owners = await prisma.user.findMany({ where: { clinicId: post.clinicId, email: { not: null } } });
  for (const owner of owners) {
    await notifyOnce({
      clinicId: post.clinicId,
      userId: owner.id,
      type: "blog_draft_ready",
      channel: "email",
      recipient: owner.email!,
      periodKey: post.id,
      send: () =>
        sendEmail({
          to: owner.email!,
          subject: `New blog post ready for your approval: "${post.title}"`,
          text: [
            `Hi,`,
            ``,
            `A new SEO blog post has been drafted for ${clinicName}'s website:`,
            ``,
            `  "${post.title}"`,
            `  Target search: ${post.targetKeyword}`,
            ``,
            `It is NOT live yet. Nothing goes on your website until you approve it.`,
            `Review, edit, approve or reject it here: ${appUrl("/dashboard/blog")}`,
            ``,
            `— Clinic Growth`,
          ].join("\n"),
        }),
    });
  }
}

export function asSections(value: unknown): BlogSection[] {
  return Array.isArray(value)
    ? value.filter((s): s is BlogSection => !!s && typeof s.heading === "string" && typeof s.body === "string")
    : [];
}

export function asFaq(value: unknown): BlogFaq[] {
  return Array.isArray(value)
    ? value.filter((f): f is BlogFaq => !!f && typeof f.question === "string" && typeof f.answer === "string")
    : [];
}
