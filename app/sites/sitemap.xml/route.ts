import { prisma } from "@/lib/prisma";
import { resolveClinicByHost } from "@/lib/resolveSiteByHost";
import { siteBaseUrl } from "@/lib/siteUrl";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Per-clinic sitemap (rewritten here from /sitemap.xml by middleware) — homepage, blog, and published posts only. */
export async function GET() {
  const site = await resolveClinicByHost();
  const base = siteBaseUrl(site);
  if (!site || !base || site.status !== "live") return new Response("Not found", { status: 404 });

  const posts = await prisma.blogPost.findMany({
    where: { clinicId: site.clinicId, status: "published" },
    select: { slug: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const urls = [
    { loc: base, lastmod: null as Date | null },
    ...["about","services","contact"].map(path=>({loc:`${base}/${path}`,lastmod:null as Date|null})),
    ...(posts.length > 0 ? [{ loc: `${base}/blog`, lastmod: posts[0].publishedAt }] : []),
    ...posts.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.publishedAt })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ""}</url>`)
  .join("\n")}
</urlset>`;

  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
