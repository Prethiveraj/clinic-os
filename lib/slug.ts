import { prisma } from "@/lib/prisma";

function baseSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "clinic";
}

/** Generates a unique, url-safe slug by appending a numeric suffix on collision. */
export async function generateUniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = baseSlug(name);
  let candidate = base;
  let suffix = 1;
  while (await exists(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function generateClinicSlug(name: string): Promise<string> {
  return generateUniqueSlug(name, async (slug) => {
    const found = await prisma.clinic.findUnique({ where: { slug } });
    return !!found;
  });
}

export async function generateSubdomainSlug(name: string): Promise<string> {
  return generateUniqueSlug(name, async (slug) => {
    const found = await prisma.siteSettings.findUnique({ where: { subdomainSlug: slug } });
    return !!found;
  });
}
