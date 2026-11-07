import { siteBaseUrl, siteDisplayHost } from "@/lib/siteUrl";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ScoreBreakdown from "@/components/ScoreBreakdown";

export default async function DashboardOverviewPage() {
  const user = await requireUser();

  if (!user.clinicId) {
    return (
      <div>
        <h1 className="text-2xl font-bold">No clinic yet</h1>
        <p className="mt-2 text-slate-600">
          Search your clinic and generate a demo first.{" "}
          <Link href="/" className="text-brand-700 underline">
            Go to search
          </Link>
        </p>
      </div>
    );
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: user.clinicId },
    include: {
      scores: { orderBy: { computedAt: "desc" }, take: 1 },
      siteSettings: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      leads: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!clinic) return null;

  const pendingBlogPosts = await prisma.blogPost.count({
    where: { clinicId: clinic.id, status: "pending_approval" },
  });
  const score = clinic.scores[0];
  const subscription = clinic.subscriptions[0];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{clinic.name}</h1>
        <p className="text-slate-500">{clinic.address}</p>
      </div>

      {pendingBlogPosts > 0 && (
        <Link
          href="/dashboard/blog"
          className="block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 hover:bg-emerald-100"
        >
          {pendingBlogPosts === 1 ? "1 blog post is" : `${pendingBlogPosts} blog posts are`} waiting for your
          approval before going on your website. Review now →
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Site status</p>
          <p className="mt-1 text-lg font-semibold capitalize">{clinic.siteSettings?.status ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Subscription</p>
          <p className="mt-1 text-lg font-semibold capitalize">{subscription?.status ?? "None"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Leads (recent)</p>
          <p className="mt-1 text-lg font-semibold">{clinic.leads.length}</p>
        </div>
      </div>

      {clinic.siteSettings && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Your site</p>
          <a
            href={siteBaseUrl(clinic.siteSettings) ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 underline"
          >
            {siteDisplayHost(clinic.siteSettings)}
          </a>
        </div>
      )}

      {score && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Growth score</h2>
          <ScoreBreakdown overall={score.overallScore} subScores={score.subScores as Record<string, number>} />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent leads</h2>
        {clinic.leads.length === 0 ? (
          <p className="text-slate-500">No leads yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {clinic.leads.map((lead) => (
              <li key={lead.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{lead.name ?? "Anonymous"}</span>{" "}
                <span className="text-slate-400">via {lead.source}</span>
                {lead.phone && <span className="ml-2 text-slate-600">{lead.phone}</span>}
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/leads" className="mt-2 inline-block text-sm text-brand-700 underline">
          View all leads →
        </Link>
      </div>
    </div>
  );
}
