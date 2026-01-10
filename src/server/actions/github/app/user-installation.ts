"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";

/**
 * Returns a "default" GitHub App installationId for the current user, if any.
 *
 * Since project creation happens before a project exists, we reuse an existing
 * installationId from any of the user's projects (early-stage / single-tenant UX).
 */
export async function getUserDefaultGitHubAppInstallationId() {
  const session = await requireAuth();

  const integration = await prisma.gitHubIntegration.findFirst({
    where: {
      installationId: { not: null },
      project: { userId: session.user.id },
    },
    orderBy: { updatedAt: "desc" },
    select: { installationId: true },
  });

  return {
    success: true as const,
    installationId: integration?.installationId || null,
  };
}
