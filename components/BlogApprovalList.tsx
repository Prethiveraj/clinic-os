"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Section = { heading: string; body: string };
type Faq = { question: string; answer: string };

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  targetKeyword: string;
  sourceQuestions: string[];
  keywordSource: string;
  intro: string;
  sections: Section[];
  faq: Faq[];
  status: "pending_approval" | "published" | "rejected";
  rejectionNote: string | null;
  generatedAt: string;
  publishedAt: string | null;
};

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="mt-2 text-sm leading-relaxed text-slate-700">
          {p}
        </p>
      ))}
    </>
  );
}

function SourceBadge({ source }: { source: string }) {
  return source === "google_autocomplete" ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      Based on real Google searches
    </span>
  ) : (
    <span
      className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
      title="Google search suggestions couldn't be reached, so common generic questions were used instead."
    >
      Generic questions
    </span>
  );
}

function Preview({ post }: { post: BlogPostRow }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">Google preview</p>
      <p className="mt-1 text-base font-medium text-blue-800">{post.title}</p>
      <p className="text-sm text-slate-600">{post.metaDescription}</p>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
        <Paragraphs text={post.intro} />
        {post.sections.map((s, i) => (
          <div key={i} className="mt-4">
            <h4 className="font-semibold text-slate-900">{s.heading}</h4>
            <Paragraphs text={s.body} />
          </div>
        ))}
        {post.faq.length > 0 && (
          <div className="mt-5">
            <h4 className="font-semibold text-slate-900">Frequently asked questions</h4>
            {post.faq.map((f, i) => (
              <div key={i} className="mt-3">
                <p className="text-sm font-medium text-slate-900">{f.question}</p>
                <p className="mt-1 text-sm text-slate-700">{f.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

function Editor({ post, onSaved, onCancel }: { post: BlogPostRow; onSaved: (p: BlogPostRow) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(post);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/blog/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          metaDescription: draft.metaDescription,
          intro: draft.intro,
          sections: draft.sections,
          faq: draft.faq,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      onSaved(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const setSection = (i: number, patch: Partial<Section>) =>
    setDraft({ ...draft, sections: draft.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setFaq = (i: number, patch: Partial<Faq>) =>
    setDraft({ ...draft, faq: draft.faq.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-xs font-medium text-slate-500">
        Title
        <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <label className="block text-xs font-medium text-slate-500">
        Meta description (shown in Google results)
        <textarea
          className={inputClass}
          rows={2}
          value={draft.metaDescription}
          onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
        />
      </label>
      <label className="block text-xs font-medium text-slate-500">
        Introduction
        <textarea className={inputClass} rows={4} value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />
      </label>
      {draft.sections.map((s, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-3">
          <input className={`${inputClass} font-medium`} value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} />
          <textarea className={`${inputClass} mt-2`} rows={4} value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} />
        </div>
      ))}
      {draft.faq.map((f, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-3">
          <input className={`${inputClass} font-medium`} value={f.question} onChange={(e) => setFaq(i, { question: e.target.value })} />
          <textarea className={`${inputClass} mt-2`} rows={2} value={f.answer} onChange={(e) => setFaq(i, { answer: e.target.value })} />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, liveBaseUrl }: { post: BlogPostRow; liveBaseUrl: string | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(post);
  const [open, setOpen] = useState(post.status === "pending_approval");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject" | "unpublish") {
    let note: string | undefined;
    if (action === "reject") {
      const input = window.prompt("Optional: why are you rejecting this draft?");
      if (input === null) return;
      note = input || undefined;
    }
    if (action === "unpublish" && !window.confirm("Take this post off your website?")) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/blog/${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{current.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Target search: <span className="font-medium text-slate-700">{current.targetKeyword}</span> ·{" "}
            {new Date(current.status === "published" && current.publishedAt ? current.publishedAt : current.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <SourceBadge source={current.keywordSource} />
      </div>

      {current.sourceQuestions.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">Answers: {current.sourceQuestions.join(" · ")}</p>
      )}
      {current.status === "rejected" && current.rejectionNote && (
        <p className="mt-2 text-xs text-slate-500">Your note: {current.rejectionNote}</p>
      )}

      {editing ? (
        <Editor
          post={current}
          onSaved={(p) => {
            setCurrent(p);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        open && <Preview post={current} />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          {current.status !== "published" && (
            <button
              onClick={() => act("approve")}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve &amp; publish
            </button>
          )}
          {current.status === "pending_approval" && (
            <button onClick={() => act("reject")} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
              Reject
            </button>
          )}
          {current.status === "published" && liveBaseUrl && (
            <a
              href={`${liveBaseUrl}/blog/${current.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              View on website
            </a>
          )}
          {current.status === "published" && (
            <button onClick={() => act("unpublish")} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
              Unpublish
            </button>
          )}
          <button onClick={() => setEditing(true)} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
            Edit
          </button>
          {!open && (
            <button onClick={() => setOpen(true)} className="px-2 py-2 text-sm text-slate-500 hover:text-slate-800">
              Preview
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BlogApprovalList({
  posts,
  canGenerate,
  liveBaseUrl,
}: {
  posts: BlogPostRow[];
  canGenerate: boolean;
  liveBaseUrl: string | null;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/blog", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate a draft");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a draft");
    } finally {
      setGenerating(false);
    }
  }

  const groups: { label: string; status: BlogPostRow["status"] }[] = [
    { label: "Awaiting your approval", status: "pending_approval" },
    { label: "Published on your website", status: "published" },
    { label: "Rejected", status: "rejected" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={generate}
          disabled={!canGenerate || generating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {generating ? "Researching keywords and writing…" : "Generate a new draft now"}
        </button>
        {!canGenerate && <span className="text-sm text-slate-500">Available with an active subscription.</span>}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {posts.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          No posts yet. A new draft is written for you every week — you&apos;ll get an email when it&apos;s ready to review.
        </p>
      )}

      {groups.map(({ label, status }) => {
        const inGroup = posts.filter((p) => p.status === status);
        if (inGroup.length === 0) return null;
        return (
          <section key={status} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {label} ({inGroup.length})
            </h2>
            <div className="mt-3 space-y-4">
              {inGroup.map((p) => (
                <PostCard key={p.id} post={p} liveBaseUrl={liveBaseUrl} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
