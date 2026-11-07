import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteSettingsForm from "@/components/SiteSettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user.clinicId) return <p className="text-slate-500">No clinic on this account yet.</p>;

  const settings = await prisma.siteSettings.findUnique({ where: { clinicId: user.clinicId } });
  if (!settings) return <p className="text-slate-500">Generate your demo site first.</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Site settings</h1>
      <p className="mt-2 text-slate-600">
        Google Analytics, Search Console verification, and custom scripts (remarketing pixels, chat
        widgets). These render on your live public site — use with care.
      </p>
      <div className="mt-6">
        <SiteSettingsForm
          gaMeasurementId={settings.gaMeasurementId}
          gscVerificationMethod={settings.gscVerificationMethod}
          gscVerificationValue={settings.gscVerificationValue}
          customHeaderScripts={settings.customHeaderScripts}
          customBodyScripts={settings.customBodyScripts}
          blogAutoGenerate={settings.blogAutoGenerate}
          photoRemindersEnabled={settings.photoRemindersEnabled}
        />
      </div>
    </div>
  );
}
