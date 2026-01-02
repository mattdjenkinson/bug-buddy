"use server";

import { prisma } from "@/lib/prisma";

export async function getSecretKeyForProject(
  projectKey: string,
): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { apiKey: projectKey },
    select: {
      secretKey: true,
    },
  });

  return project?.secretKey || null;
}
