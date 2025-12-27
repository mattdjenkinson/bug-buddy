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

    // Get current user's login to prioritize their repos first
    const { data: currentUser } = await octokit.rest.users.getAuthenticated();
    const currentUserLogin = currentUser.login;

    // Fetch all repositories including organization repos
    // Use affiliation parameter to ensure we get all repos the user has access to:
    // - owner: repos owned by the user
    // - collaborator: repos where user is a collaborator
    // - organization_member: repos from orgs the user is a member of
    //
    // Note: Some organizations may restrict third-party access. If you don't see
    // organization repos, you may need to:
    // 1. Re-authorize the OAuth app to get updated scopes (repo, read:org)
    // 2. Have your organization approve the OAuth app at:
    //    https://github.com/settings/connections/applications
    const allRepos = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const { data: repos } =
          await octokit.rest.repos.listForAuthenticatedUser({
            affiliation: "owner,collaborator,organization_member",
            sort: "updated",
            per_page: perPage,
            page,
          });

        allRepos.push(...repos);

        // Check if there are more pages
        // GitHub API uses Link header for pagination, but we can also check if we got fewer than perPage
        hasMore = repos.length === perPage;
        page++;
      }
    } catch (repoError) {
      // Check if it's a 403 Forbidden, which might indicate scope/permission issues
      const error = repoError as { status?: number; message?: string };
      if (error?.status === 403) {
        console.error(
          "GitHub API returned 403 - possible scope or permission issue",
        );
        throw new Error(
          "Access denied. Please ensure your GitHub OAuth app has the required permissions (repo, read:org). You may need to re-authorize the app or have your organization approve it at https://github.com/settings/connections/applications",
        );
      }
      throw repoError;
    }

    // Format repositories for display
    const repositories = allRepos
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        description: repo.description,
      }))
      .sort((a, b) => {
        // Sort by owner: user's repos first, then alphabetically by owner
        if (a.owner === currentUserLogin && b.owner !== currentUserLogin) {
          return -1;
        }
        if (a.owner !== currentUserLogin && b.owner === currentUserLogin) {
          return 1;
        }
        // If same owner category, sort by owner name, then by repo name
        if (a.owner !== b.owner) {
          return a.owner.localeCompare(b.owner);
        }
        return a.name.localeCompare(b.name);
      });

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
