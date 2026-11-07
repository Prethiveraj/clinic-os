import { appBaseDomain } from "@/lib/siteUrl";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DomainConnectForm from "@/components/DomainConnectForm";

export default async function DomainPage() {
  const user = await requireUser();
  if (!user.clinicId) return <p className="text-slate-500">No clinic on this account yet.</p>;

  const settings = await prisma.siteSettings.findUnique({ where: { clinicId: user.clinicId } });
  const baseDomain = appBaseDomain();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Custom domain</h1>
      <p className="mt-2 text-slate-600">
        Your site is always reachable at{" "}
        <span className="font-mono">
          {settings?.subdomainSlug}.{baseDomain}
        </span>{" "}
        — connecting a custom domain is optional and the subdomain keeps working as a fallback.
      </p>

      <div className="mt-6">
        <DomainConnectForm
          currentDomain={settings?.customDomain ?? null}
          verified={settings?.domainVerified ?? false}
          baseDomain={baseDomain}
        />
      </div>
    </div>
  );
}
