"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { createWebhook } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/schemas";
import { Octokit } from "@octokit/rest";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createProject(data: z.infer<typeof createProjectSchema>) {
  try {
    const session = await requireAuth();
    const validated = createProjectSchema.parse(data);

    // Verify GitHub account is connected (required for repository)
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
          "GitHub account not connected. Please connect your GitHub account to create a project.",
      };
    }

    // Validate repository format and access
    const [repositoryOwner, repositoryName] = validated.repository.split("/");
    if (!repositoryOwner || !repositoryName) {
      return {
        success: false,
        error: "Invalid repository format. Please use format: owner/repo",
      };
    }

    // Verify token has access to the repository
    try {
      const octokit = new Octokit({ auth: account.accessToken });
      const { data: repo } = await octokit.rest.repos.get({
        owner: repositoryOwner,
        repo: repositoryName,
      });

      // Check if repository has issues enabled
      if (!repo.has_issues) {
        return {
          success: false,
          error: `Repository ${repositoryOwner}/${repositoryName} has issues disabled. Please enable issues in the repository settings.`,
        };
      }
    } catch (error) {
      const githubError = error as { status?: number; message?: string };
      if (githubError.status === 404) {
        return {
          success: false,
          error: `Repository ${repositoryOwner}/${repositoryName} not found or you don't have access to it.`,
        };
      }
      if (githubError.status === 403) {
        return {
          success: false,
          error:
            "Access denied. Your GitHub OAuth token doesn't have the 'repo' scope required. Please re-authenticate with GitHub.",
        };
      }
      throw error;
    }

    // Generate API key and secret key
    const apiKey = `bb_${randomBytes(32).toString("hex")}`;
    const secretKey = `bb_sk_${randomBytes(32).toString("hex")}`;

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        apiKey,
        secretKey,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            feedback: true,
          },
        },
      },
    });

    // Create GitHub integration (repository is required)
    const webhookSecret = randomBytes(32).toString("hex");

    await prisma.gitHubIntegration.create({
      data: {
        projectId: project.id,
        repositoryOwner,
        repositoryName,
        webhookSecret,
        defaultLabels: [],
        defaultAssignees: [],
      },
    });

    // Automatically create webhook if it doesn't exist
    // This will fail gracefully if the token doesn't have admin:repo_hook scope
    const webhookResult = await createWebhook(project.id);
    let webhookWarning: string | undefined;
    if (!webhookResult.success && webhookResult.error) {
      // Log the error but don't fail project creation
      // The webhook can be created manually later
      console.warn(
        `Webhook creation failed for project ${project.id}: ${webhookResult.error}`,
      );
      webhookWarning = webhookResult.error;
    }

    revalidatePath("/dashboard/projects", "layout");

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        apiKey: project.apiKey,
        createdAt: project.createdAt.toISOString(),
        _count: project._count,
        githubIntegration: {
          repositoryOwner,
          repositoryName,
        },
      },
      webhookWarning,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error creating project:", error);
    return { success: false, error: "Internal server error" };
  }
}
