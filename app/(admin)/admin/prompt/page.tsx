import { requireAdmin } from "@/lib/auth";
import { resolveActivePrompt } from "@/lib/ai";
import PromptEditorForm from "@/components/PromptEditorForm";

export default async function AdminPromptPage() {
  await requireAdmin();
  const active = await resolveActivePrompt();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Site-generation prompt</h1>
      <p className="mt-2 text-slate-600">
        Editing this changes what the AI (Groq) generates for every clinic's demo site copy — no deploy needed.
        Bump the version string so future generations are attributable (site_content.prompt_version).
      </p>
      <div className="mt-6">
        <PromptEditorForm systemPrompt={active.systemPrompt} version={active.version} />
      </div>
    </div>
  );
}
