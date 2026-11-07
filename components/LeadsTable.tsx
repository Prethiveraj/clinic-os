"use client";

import { useState } from "react";

type LeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  source: string;
  message: string | null;
  createdAt: string;
  isPatient: boolean;
};

export default function LeadsTable({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleConvert(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboard/leads/${id}/convert`, { method: "POST" });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, isPatient: true } : l)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Message</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td className="px-4 py-3">{lead.name ?? "—"}</td>
              <td className="px-4 py-3">{lead.phone ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{lead.source.replace(/_/g, " ")}</td>
              <td className="max-w-xs truncate px-4 py-3">{lead.message ?? "—"}</td>
              <td className="px-4 py-3 text-slate-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {lead.isPatient ? (
                  <span className="text-green-700">Patient</span>
                ) : (
                  <button
                    onClick={() => handleConvert(lead.id)}
                    disabled={busyId === lead.id}
                    className="text-brand-700 underline disabled:opacity-50"
                  >
                    Convert to patient
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && <p className="p-6 text-center text-slate-400">No leads yet.</p>}
    </div>
  );
}
