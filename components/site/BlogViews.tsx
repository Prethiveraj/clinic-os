import Link from "next/link";
import type { BlogPost } from "@prisma/client";
import { asFaq, asSections } from "@/lib/blog";

/** JSON for a <script type="application/ld+json"> — escape "<" so content can't close the script tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="mt-4 leading-relaxed text-slate-700">
          {p}
        </p>
      ))}
    </>
  );
}

function formatDate(d: Date | null): string {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
}

export function BlogIndex({ clinicName, posts, base="" }: { clinicName: string; posts: BlogPost[]; base?:string }) {
  return (
    <main className="clinic-design mx-auto max-w-3xl px-6 py-14">
      <Link href={base+"/"} className="text-sm text-brand-700 hover:underline">
        ← {clinicName}
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Blog</h1>
      {posts.length === 0 ? (
        <p className="mt-6 text-slate-500">No articles yet.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {posts.map((p) => (
            <li key={p.id} className="border-b border-slate-100 pb-6">
              <Link href={`${base}/blog/${p.slug}`} className="text-xl font-semibold text-slate-900 hover:text-brand-700">
                {p.title}
              </Link>
              <p className="mt-1 text-sm text-slate-400">{formatDate(p.publishedAt)}</p>
              <p className="mt-2 text-slate-600">{p.metaDescription}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export function BlogArticle({ clinicName, post, canonicalUrl, base="" }: { clinicName: string; post: BlogPost; canonicalUrl: string | null; base?:string }) {
  const sections = asSections(post.sections);
  const faq = asFaq(post.faq);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.publishedAt?.toISOString(),
      author: { "@type": "Organization", name: clinicName },
      publisher: { "@type": "Organization", name: clinicName },
      ...(canonicalUrl ? { mainEntityOfPage: canonicalUrl } : {}),
    },
    ...(faq.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <main className="clinic-design mx-auto max-w-3xl px-6 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <Link href={base+"/blog"} className="text-sm text-brand-700 hover:underline">
        ← All articles
      </Link>
      <article>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{post.title}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {clinicName} · {formatDate(post.publishedAt)}
        </p>
        <p className="mt-3 text-xs text-slate-500">{Math.max(1,Math.ceil((post.intro+JSON.stringify(post.sections)).split(/\s+/).length/200))} min read · Reviewed for publication by {clinicName}</p>
        {sections.length>1 && <nav aria-label="In this article" className="my-8 rounded-2xl bg-slate-50 p-6"><p className="mb-3 text-xs uppercase tracking-widest text-slate-500">In this article</p><ol className="space-y-2">{sections.map((s,i)=><li key={i}><a href={'#section-'+i} className="text-sm underline decoration-slate-300 underline-offset-4">{s.heading}</a></li>)}</ol></nav>}
        <Paragraphs text={post.intro} />
        {sections.map((s, i) => (
          <section key={i} id={"section-"+i}>
            <h2 className="mt-10 text-xl font-semibold text-slate-900">{s.heading}</h2>
            <Paragraphs text={s.body} />
          </section>
        ))}
        {faq.length > 0 && (
          <section className="mt-12 rounded-xl bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Frequently asked questions</h2>
            {faq.map((f, i) => (
              <div key={i} className="mt-5">
                <h3 className="font-medium text-slate-900">{f.question}</h3>
                <p className="mt-1 text-slate-700">{f.answer}</p>
              </div>
            ))}
          </section>
        )}
        <p className="mt-10 text-xs text-slate-400">
          This article is general information, not medical advice. Please consult a qualified professional about
          your own situation.
        </p>
      </article>
      <div className="mt-10">
        <Link href={base+"/"} className="inline-block rounded-lg bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700">
          Contact {clinicName}
        </Link>
      </div>
    </main>
  );
}
