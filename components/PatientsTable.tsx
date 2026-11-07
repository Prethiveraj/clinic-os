"use client";

import { useState } from "react";

type PatientRow = {
  id: string;
  name: string | null;
  phone: string | null;
  lastVisitDate: string | null;
  notes: string | null;
};

export default function PatientsTable({ initialPatients }: { initialPatients: PatientRow[] }) {
  const [patients, setPatients] = useState(initialPatients);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateVisit(id: string, dateValue: string) {
    setBusyId(id);
    try {
      const iso = dateValue ? new Date(dateValue).toISOString() : null;
      const res = await fetch(`/api/dashboard/patients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastVisitDate: iso }),
      });
      if (res.ok) {
        setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, lastVisitDate: iso } : p)));
      }
    } finally {
      setBusyId(null);
    }
  }

  function markToday(id: string) {
    updateVisit(id, new Date().toISOString().slice(0, 10));
  }

  if (patients.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
        No patients yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Last visit</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {patients.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3">{p.name ?? "—"}</td>
              <td className="px-4 py-3">{p.phone ?? "—"}</td>
              <td className="px-4 py-3">
                <input
                  type="date"
                  value={p.lastVisitDate ? p.lastVisitDate.slice(0, 10) : ""}
                  onChange={(e) => updateVisit(p.id, e.target.value)}
                  disabled={busyId === p.id}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => markToday(p.id)}
                  disabled={busyId === p.id}
                  className="text-brand-700 underline disabled:opacity-50"
                >
                  Mark visit today
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
