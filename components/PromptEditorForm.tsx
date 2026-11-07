"use client";

import { useState } from "react";

export default function PromptEditorForm({ systemPrompt, version }: { systemPrompt: string; version: string }) {
  const [content, setContent] = useState(systemPrompt);
  const [newVersion, setNewVersion] = useState(version);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: content, version: newVersion }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
      />
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Version</label>
        <input
          value={newVersion}
          onChange={(e) => setNewVersion(e.target.value)}
          className="w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save prompt"}
      </button>
    </form>
  );
}
