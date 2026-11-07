import AdminClinicsTable from "@/components/AdminClinicsTable";

export default function AdminClinicsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Clinics</h1>
      <div className="mt-6">
        <AdminClinicsTable />
      </div>
    </div>
  );
}
