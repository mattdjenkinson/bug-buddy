"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { getInstallationAccessToken } from "@/lib/github-app-auth";
import { prisma } from "@/lib/prisma";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

const byInstallationSchema = z.object({
  installationId: z.string().min(1),
});

const byProjectSchema = z.object({
  projectId: z.string().min(1),
});

async function listReposForInstallation(installationId: string) {
  const token = await getInstallationAccessToken(installationId);
  const octokit = new Octokit({ auth: token });

  const repos: Array<{
    id: number;
    name: string;
    fullName: string;
    owner: string;
    private: boolean;
    description: string | null;
  }> = [];

  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore) {
    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: perPage,
      page,
    });

    const pageRepos = data.repositories || [];
    repos.push(
      ...pageRepos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner?.login || "",
        private: repo.private,
        description: repo.description || null,
      })),
    );

    hasMore = pageRepos.length === perPage;
    page++;
  }

  repos.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return repos;
}

/**
 * Used during project creation (no projectId exists yet).
 */
export async function getInstallationRepositories(
  input: z.infer<typeof byInstallationSchema>,
) {
  await requireAuth();
  const { installationId } = byInstallationSchema.parse(input);

  try {
    const repositories = await listReposForInstallation(installationId);
    return { success: true as const, repositories };
  } catch (error) {
    console.error("Error fetching installation repositories:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to fetch repositories",
      repositories: [],
    };
  }
}

/**
 * Used on the Settings page after an installation is linked to a project.
 */
export async function getProjectInstallationRepositories(
  input: z.infer<typeof byProjectSchema>,
) {
  const session = await requireAuth();
  const { projectId } = byProjectSchema.parse(input);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: { githubIntegration: true },
  });
  if (!project) {
    return {
      success: false as const,
      error: "Project not found",
      repositories: [],
    };
  }

  const installationId = project.githubIntegration?.installationId;
  if (!installationId) {
    return {
      success: false as const,
      error: "GitHub App is not installed for this project yet.",
      repositories: [],
    };
  }

  try {
    const repositories = await listReposForInstallation(installationId);
    return { success: true as const, repositories };
  } catch (error) {
    console.error("Error fetching project installation repositories:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to fetch repositories",
      repositories: [],
    };
  }
}
