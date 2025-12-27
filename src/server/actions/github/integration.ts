/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { Octokit } from "@octokit/rest";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const integrationSchema = z.object({
  projectId: z.string(),
  personalAccessToken: z.string().optional(), // Optional - will use OAuth token if not provided
  repositoryOwner: z.string(),
  repositoryName: z.string(),
  defaultLabels: z.array(z.string()).optional(),
  defaultAssignees: z.array(z.string()).optional(),
});

export async function saveGitHubIntegration(
  data: z.infer<typeof integrationSchema>,
) {
  try {
    const session = await requireAuth();
    const validated = integrationSchema.parse(data);

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: validated.projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Determine which token to use
    let tokenToUse: string | null = null;
    let isOAuthToken = false;

    if (validated.personalAccessToken) {
      tokenToUse = validated.personalAccessToken;
    } else {
      const account = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          providerId: "github",
        },
      });

      if (!account?.accessToken) {
        return {
          success: false,
          error:
            "No GitHub access token found. Please provide a Personal Access Token or ensure you're signed in with GitHub.",
        };
      }
      tokenToUse = account.accessToken;
      isOAuthToken = true;
    }

    // Verify token has access to the repository
    try {
      const octokit = new Octokit({ auth: tokenToUse });

      // Try to access the repository
      const { data: repo } = await octokit.rest.repos.get({
        owner: validated.repositoryOwner,
        repo: validated.repositoryName,
      });

      // Check if repository has issues enabled
      if (!repo.has_issues) {
        return {
          success: false,
          error: `Repository ${validated.repositoryOwner}/${validated.repositoryName} has issues disabled. Please enable issues in the repository settings.`,
        };
      }
    } catch (error: any) {
      if (error.status === 404) {
        return {
          success: false,
          error: `Repository ${validated.repositoryOwner}/${validated.repositoryName} not found or you don't have access to it.`,
        };
      }
      if (error.status === 403) {
        const errorMessage = isOAuthToken
          ? `Access denied. Your GitHub OAuth token doesn't have the 'repo' scope required to create issues. Please provide a Personal Access Token with repo permissions, or re-authenticate with GitHub and ensure the OAuth app requests the 'repo' scope.`
          : `Access denied. Your Personal Access Token doesn't have permission to access this repository. Please ensure the token has the 'repo' scope.`;
        return {
          success: false,
          error: errorMessage,
        };
      }
      // Re-throw unexpected errors
      throw error;
    }

    // Upsert GitHub integration
    const integration = await prisma.gitHubIntegration.upsert({
      where: { projectId: validated.projectId },
      update: {
        personalAccessToken: validated.personalAccessToken || null, // Store PAT if provided, otherwise null (will use OAuth token)
        repositoryOwner: validated.repositoryOwner,
        repositoryName: validated.repositoryName,
        defaultLabels: validated.defaultLabels || [],
        defaultAssignees: validated.defaultAssignees || [],
      },
      create: {
        projectId: validated.projectId,
        personalAccessToken: validated.personalAccessToken || null, // Store PAT if provided, otherwise null (will use OAuth token)
        repositoryOwner: validated.repositoryOwner,
        repositoryName: validated.repositoryName,
        defaultLabels: validated.defaultLabels || [],
        defaultAssignees: validated.defaultAssignees || [],
      },
    });

    revalidatePath("/dashboard/settings", "layout");
    return { success: true, integration };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error saving GitHub integration:", error);
    return { success: false, error: "Internal server error" };
  }
}
