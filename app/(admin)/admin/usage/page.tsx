import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminUsagePage() {
  await requireAdmin();

  const usage = await prisma.generationUsage.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { clinic: { select: { name: true } } },
  });

  const totals = usage.reduce<Record<string, number>>((acc, row) => {
    acc[row.api] = (acc[row.api] ?? 0) + row.costEstimate;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold">API usage</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Object.entries(totals).map(([api, total]) => (
          <div key={api} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">{api}</p>
            <p className="mt-1 text-lg font-semibold">${total.toFixed(2)} est.</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">API</th>
              <th className="px-4 py-3">Clinic</th>
              <th className="px-4 py-3">Cost est.</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usage.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.api}</td>
                <td className="px-4 py-3">{row.clinic?.name ?? "—"}</td>
                <td className="px-4 py-3">${row.costEstimate.toFixed(3)}</td>
                <td className="px-4 py-3 text-slate-400">{row.createdAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
