"use client";

import { useEffect, useState, useCallback } from "react";

type ClinicRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  latestScore: number | null;
  siteStatus: string | null;
  subdomain: string | null;
  customDomain: string | null;
  subscriptionStatus: string | null;
};

export default function AdminClinicsTable() {
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/clinics");
    const data = await res.json();
    setClinics(data.clinics ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRescan(id: string) {
    setBusyId(id);
    await fetch(`/api/clinics/${id}/score`, { method: "POST" });
    await load();
    setBusyId(null);
  }

  async function handleRegenerate(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/clinics/${id}/regenerate`, { method: "POST" });
    await load();
    setBusyId(null);
  }

  async function handleSyncReviews(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/clinics/${id}/reviews-sync`, { method: "POST" });
    setBusyId(null);
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Clinic</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Site</th>
            <th className="px-4 py-3">Subscription</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clinics.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 capitalize">{c.status}</td>
              <td className="px-4 py-3">{c.latestScore ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{c.siteStatus ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{c.subscriptionStatus ?? "—"}</td>
              <td className="space-x-3 px-4 py-3">
                <button
                  onClick={() => handleRescan(c.id)}
                  disabled={busyId === c.id}
                  className="text-brand-700 underline disabled:opacity-50"
                >
                  Rescan
                </button>
                <button
                  onClick={() => handleRegenerate(c.id)}
                  disabled={busyId === c.id}
                  className="text-brand-700 underline disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  onClick={() => handleSyncReviews(c.id)}
                  disabled={busyId === c.id}
                  className="text-brand-700 underline disabled:opacity-50"
                >
                  Sync reviews
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {clinics.length === 0 && <p className="p-6 text-center text-slate-400">No clinics yet.</p>}
    </div>
  );
}
