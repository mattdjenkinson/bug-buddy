import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function generateUniqueProjectSlug(name: string): Promise<string> {
  const base = slugify(name);

  // Try base first, then base-2, base-3, ... until unique.
  // Global uniqueness (not per-user).
  let candidate = base;
  for (let i = 1; i < 10_000; i++) {
    const existing = await prisma.project.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;

    candidate = `${base}-${i + 1}`;
  }

  // Extremely unlikely unless a malicious collision scenario.
  throw new Error("Unable to generate a unique project slug");
}
