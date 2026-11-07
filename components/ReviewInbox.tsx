"use client";

import { useState } from "react";

type ReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  text: string | null;
  reviewTime: string;
  suggestedReply: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-slate-200">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function ReviewCard({ review, onChange }: { review: ReviewRow; onChange: (r: ReviewRow) => void }) {
  const [draft, setDraft] = useState(review.suggestedReply ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/dashboard/reviews/${review.id}/reply`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDraft(data.suggestedReply ?? "");
        onChange({ ...review, suggestedReply: data.suggestedReply });
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/reviews/${review.id}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: draft }),
      });
      const data = await res.json();
      if (res.ok) onChange({ ...review, suggestedReply: data.suggestedReply });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-slate-900">{review.authorName}</span>{" "}
          <Stars rating={review.rating} />
        </div>
        <span className="text-xs text-slate-400">{new Date(review.reviewTime).toLocaleDateString()}</span>
      </div>
      {review.text && <p className="mt-2 text-sm text-slate-700">{review.text}</p>}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase text-slate-400">AI-drafted reply</span>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs font-medium text-brand-700 underline disabled:opacity-50"
          >
            {generating ? "Generating…" : draft ? "Regenerate" : "Generate reply"}
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Generate a draft, then edit it before posting to Google yourself."
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !draft}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save edits"}
          </button>
          <button
            onClick={handleCopy}
            disabled={!draft}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewInbox({
  hasGooglePlace,
  initialReviews,
}: {
  hasGooglePlace: boolean;
  initialReviews: ReviewRow[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [syncing, setSyncing] = useState(false);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/reviews/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      const refreshed = await fetch("/api/dashboard/reviews");
      const refreshedData = await refreshed.json();
      setReviews(refreshedData.reviews ?? []);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSentiment() {
    setSentimentLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/reviews/sentiment", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to summarize");
      setSentiment(data.summary);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSentimentLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing || !hasGooglePlace}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          title={hasGooglePlace ? undefined : "No linked Google Place yet"}
        >
          {syncing ? "Syncing…" : "Sync latest reviews"}
        </button>
        <button
          onClick={handleSentiment}
          disabled={sentimentLoading || reviews.length === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {sentimentLoading ? "Summarizing…" : "Summarize sentiment"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {sentiment && (
        <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-900">
          <span className="font-medium">Sentiment: </span>
          {sentiment}
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            onChange={(updated) => setReviews((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
          />
        ))}
        {reviews.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
            No reviews synced yet.
          </p>
        )}
      </div>
    </div>
  );
}
