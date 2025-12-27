"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { Octokit } from "@octokit/rest";

export async function getUserRepositories() {
  try {
    const session = await requireAuth();

    // Get user's GitHub account
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "github",
      },
    });

    if (!account?.accessToken) {
      return {
        success: false,
        error: "No GitHub account connected. Please sign in with GitHub.",
        repositories: [],
      };
    }

    // Create Octokit client with user's OAuth token
    const octokit = new Octokit({
      auth: account.accessToken,
    });

    // Fetch user repositories (including organization repos they have access to)
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });

    // Format repositories for display
    const repositories = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      description: repo.description,
    }));

    return {
      success: true,
      repositories,
    };
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch repositories",
      repositories: [],
    };
  }
}
