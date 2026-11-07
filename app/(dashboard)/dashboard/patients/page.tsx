import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PatientsTable from "@/components/PatientsTable";

export default async function PatientsPage() {
  const user = await requireUser();
  if (!user.clinicId) return <p className="text-slate-500">No clinic on this account yet.</p>;

  const patients = await prisma.patient.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Patients</h1>
      <p className="mt-2 text-slate-600">
        Leads you've converted into patients. Update their last visit date yourself to keep track of
        who's due for a follow-up — this list isn't synced from a booking system.
      </p>
      <div className="mt-6">
        <PatientsTable
          initialPatients={patients.map((p) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            lastVisitDate: p.lastVisitDate ? p.lastVisitDate.toISOString() : null,
            notes: p.notes,
          }))}
        />
      </div>
      <p className="mt-4 text-sm text-slate-400">
        Convert a lead into a patient from the <a href="/dashboard/leads" className="underline">Leads</a> page.
      </p>
    </div>
  );
}
