"use server";

import { serverEnv } from "@/env";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const installGitHubAppSchema = z.object({
  projectId: z.string().min(1),
  redirectUrl: z.string().min(1).optional(),
});

const installGitHubAppForCreateProjectSchema = z.object({
  redirectUrl: z.string().min(1).optional(),
});

/**
 * Starts the GitHub App installation flow.
 *
 * GitHub will redirect to the App's configured "Setup URL" / callback URL with:
 * - installation_id
 * - state
 */
export async function startGitHubAppInstall(
  input: z.infer<typeof installGitHubAppSchema>,
) {
  const session = await requireAuth();
  const { projectId, redirectUrl } = installGitHubAppSchema.parse(input);

  if (!serverEnv.GITHUB_APP_SLUG) {
    throw new Error("GITHUB_APP_SLUG is not configured");
  }

  // Ensure user owns the project.
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) {
    throw new Error("Project not found");
  }

  const finalRedirectUrl =
    redirectUrl || `/dashboard/${project.slug}/settings?tab=github`;

  // Persist a short-lived state value to prevent CSRF.
  const state = crypto.randomUUID();
  await prisma.verification.create({
    data: {
      id: `github_app_install:${state}`,
      identifier: `github_app_install:${state}`,
      value: JSON.stringify({
        userId: session.user.id,
        projectId,
        redirectUrl: finalRedirectUrl,
      }),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // GitHub uses the app slug to route to the install screen.
  // Note: callback URL is configured in the GitHub App settings.
  const installUrl = new URL(
    `https://github.com/apps/${serverEnv.GITHUB_APP_SLUG}/installations/new`,
  );
  installUrl.searchParams.set("state", state);

  redirect(installUrl.toString());
}

/**
 * Starts the GitHub App installation flow for project creation.
 * This does NOT require a projectId; the callback will redirect back with `installation_id`.
 */
export async function startGitHubAppInstallForCreateProject(
  input: z.infer<typeof installGitHubAppForCreateProjectSchema>,
) {
  const session = await requireAuth();
  const { redirectUrl } = installGitHubAppForCreateProjectSchema.parse(input);

  if (!serverEnv.GITHUB_APP_SLUG) {
    throw new Error("GITHUB_APP_SLUG is not configured");
  }

  const finalRedirectUrl = redirectUrl || "/dashboard/new";

  const state = crypto.randomUUID();
  await prisma.verification.create({
    data: {
      id: `github_app_install:${state}`,
      identifier: `github_app_install:${state}`,
      value: JSON.stringify({
        userId: session.user.id,
        redirectUrl: finalRedirectUrl,
      }),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const installUrl = new URL(
    `https://github.com/apps/${serverEnv.GITHUB_APP_SLUG}/installations/new`,
  );
  installUrl.searchParams.set("state", state);

  redirect(installUrl.toString());
}
