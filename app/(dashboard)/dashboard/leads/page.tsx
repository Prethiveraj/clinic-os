import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LeadsTable from "@/components/LeadsTable";

export default async function LeadsPage() {
  const user = await requireUser();
  if (!user.clinicId) return <p className="text-slate-500">No clinic on this account yet.</p>;

  const leads = await prisma.lead.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { createdAt: "desc" },
    include: { patient: true },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Leads</h1>
      <div className="mt-6">
        <LeadsTable
          initialLeads={leads.map((lead) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            source: lead.source,
            message: lead.message,
            createdAt: lead.createdAt.toISOString(),
            isPatient: !!lead.patient,
          }))}
        />
      </div>
    </div>
  );
}
