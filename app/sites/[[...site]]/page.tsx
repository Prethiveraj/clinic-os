import ClinicWebsite from "@/components/site/ClinicWebsite";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveClinicByHost } from "@/lib/resolveSiteByHost";
import { siteBaseUrl } from "@/lib/siteUrl";
import ContactForm from "@/components/site/ContactForm";
import { CallButton, WhatsAppButton } from "@/components/site/LeadButtons";
import { BlogArticle, BlogIndex, jsonLdScript } from "@/components/site/BlogViews";

type Params = { params: Promise<{ site?: string[] }> };

type Route = { kind: "about" | "contact" | "services" } | { kind: "home" } | { kind: "blog-index" } | { kind: "blog-post"; slug: string };

function parseRoute(segments: string[] | undefined): Route | null {
  const parts = segments ?? [];
  if (parts.length === 0) return { kind: "home" };
  if (parts.length === 1 && ["about","contact","services"].includes(parts[0])) return {kind:parts[0] as "about"|"contact"|"services"};
  if (parts[0] !== "blog") return null;
  if (parts.length === 1) return { kind: "blog-index" };
  if (parts.length === 2) return { kind: "blog-post", slug: parts[1] };
  return null;
}

/** Only approved (published) posts are ever readable on the public site. */
function publishedPosts(clinicId: string): Promise<BlogPost[]> {
  return prisma.blogPost.findMany({
    where: { clinicId, status: "published" },
    orderBy: { publishedAt: "desc" },
  });
}

function publishedPost(clinicId: string, slug: string): Promise<BlogPost | null> {
  return prisma.blogPost.findFirst({ where: { clinicId, slug, status: "published" } });
}

export async function generateMetadata({ params: paramsPromise }: Params): Promise<Metadata> {
  const params = await paramsPromise;
  const site = await resolveClinicByHost();
  const route = parseRoute(params.site);
  if (!site || !route) return {};
  const clinic = site.clinic;
  const base = siteBaseUrl(site);

  if (route.kind === "about" || route.kind === "contact" || route.kind === "services") return {title: `${route.kind === "about" ? "Our clinic" : route.kind === "services" ? "Services" : "Contact"} | ${clinic.name}`, description: `${clinic.name} — ${clinic.address || "Contact the clinic for details"}`, alternates: base ? {canonical: `${base}/${route.kind}`} : undefined, robots: {index:site.status === "live",follow:site.status === "live"}};

  if (route.kind === "blog-index") {
    return { title: `Blog | ${clinic.name}`, alternates: base ? { canonical: `${base}/blog` } : undefined };
  }
  if (route.kind === "blog-post") {
    const post = await publishedPost(clinic.id, route.slug);
    if (!post) return {};
    return {
      title: post.title,
      description: post.metaDescription,
      alternates: base ? { canonical: `${base}/blog/${post.slug}` } : undefined,
      openGraph: { title: post.title, description: post.metaDescription, type: "article" },
    };
  }

  const seoMeta = clinic.siteContent?.seoMeta as { title?: string; description?: string } | undefined;
  return {
    title: seoMeta?.title ?? clinic.name ?? "Clinic",
    description: seoMeta?.description ?? undefined,
    alternates: base ? {canonical:base} : undefined,
    openGraph: {title:seoMeta?.title || clinic.name,description:seoMeta?.description,type:"website",url:base||undefined},
    robots: {index:site.status === "live",follow:site.status === "live"},
  };
}

export default async function ClinicSitePage({ params: paramsPromise }: Params) {
  const params = await paramsPromise;
  const site = await resolveClinicByHost();
  const route = parseRoute(params.site);
  if (!site || !route) notFound();

  const clinic = site.clinic;

  if (route.kind === "blog-index") {
    return <BlogIndex clinicName={clinic.name} posts={await publishedPosts(clinic.id)} />;
  }
  if (route.kind === "blog-post") {
    const post = await publishedPost(clinic.id, route.slug);
    if (!post) notFound();
    const base = siteBaseUrl(site);
    return <BlogArticle clinicName={clinic.name} post={post} canonicalUrl={base ? `${base}/blog/${post.slug}` : null} />;
  }

  const content = clinic.siteContent;
  if (!content) notFound();

  const posts = await publishedPosts(clinic.id);
  return <ClinicWebsite clinic={clinic} posts={posts} page={route.kind as "home"|"about"|"contact"|"services"} />;
}
