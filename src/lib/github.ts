/* eslint-disable @typescript-eslint/no-explicit-any */
import { getInstallationAccessToken } from "@/lib/github-app-auth";
import { Octokit } from "@octokit/rest";
import { prisma } from "./prisma";

export async function getGitHubClient(projectId: string) {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
    include: {
      project: true,
    },
  });

  if (!integration) {
    throw new Error("GitHub integration not found");
  }

  // Prefer GitHub App (BugBuddy identity) when installed for this project.
  if (integration.installationId) {
    const token = await getInstallationAccessToken(integration.installationId);
    return new Octokit({ auth: token });
  }

  // Intentionally do NOT fall back to the project owner's GitHub OAuth token:
  // issues should be created/synced as the GitHub App (BugBuddy), not as the user.
  throw new Error(
    "No GitHub App installation found for this project. Please install the BugBuddy GitHub App on the target repository.",
  );
}

export async function createGitHubIssue(
  projectId: string,
  title: string,
  body: string,
  labels?: string[],
  assignees?: string[],
) {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
  });

  if (!integration) {
    throw new Error("GitHub integration not found");
  }

  const octokit = await getGitHubClient(projectId);

  try {
    // First, verify we can access the repository
    await octokit.rest.repos.get({
      owner: integration.repositoryOwner,
      repo: integration.repositoryName,
    });
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(
        `Repository ${integration.repositoryOwner}/${integration.repositoryName} not found or you don't have access to it. Please check that the repository exists and your GitHub token has the necessary permissions.`,
      );
    }
    if (error.status === 403) {
      throw new Error(
        `Access denied to repository ${integration.repositoryOwner}/${integration.repositoryName}. Your GitHub token may not have the 'repo' scope. Please provide a Personal Access Token with repo permissions or re-authenticate with GitHub.`,
      );
    }
    // Re-throw other errors as-is
    throw error;
  }

  try {
    const issue = await octokit.rest.issues.create({
      owner: integration.repositoryOwner,
      repo: integration.repositoryName,
      title,
      body,
      labels: labels || integration.defaultLabels,
      assignees: assignees || integration.defaultAssignees,
    });

    return issue.data;
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(
        `Cannot create issue: Repository ${integration.repositoryOwner}/${integration.repositoryName} not found or you don't have write access. Please check your GitHub token permissions.`,
      );
    }
    if (error.status === 403) {
      throw new Error(
        `Permission denied: Your GitHub token doesn't have permission to create issues in ${integration.repositoryOwner}/${integration.repositoryName}. Please provide a Personal Access Token with 'repo' scope or re-authenticate with GitHub.`,
      );
    }
    // Re-throw other errors with context
    throw new Error(
      `Failed to create GitHub issue: ${error.message || "Unknown error"}`,
    );
  }
}

export async function closeGitHubIssue(projectId: string, issueNumber: number) {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
  });

  if (!integration) {
    throw new Error("GitHub integration not found");
  }

  const octokit = await getGitHubClient(projectId);

  const issue = await octokit.rest.issues.update({
    owner: integration.repositoryOwner,
    repo: integration.repositoryName,
    issue_number: issueNumber,
    state: "closed",
  });

  return issue.data;
}

export async function syncIssueFromGitHub(
  projectId: string,
  issueNumber: number,
) {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
  });

  if (!integration) {
    throw new Error("GitHub integration not found");
  }

  const octokit = await getGitHubClient(projectId);

  // Get issue details
  const { data: issue } = await octokit.rest.issues.get({
    owner: integration.repositoryOwner,
    repo: integration.repositoryName,
    issue_number: issueNumber,
  });

  // Get comments
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: integration.repositoryOwner,
    repo: integration.repositoryName,
    issue_number: issueNumber,
  });

  // Get linked PRs
  const { data: prs } = await octokit.rest.issues.listForRepo({
    owner: integration.repositoryOwner,
    repo: integration.repositoryName,
    state: "all",
  });
  const linkedPRs = prs.filter(
    (pr) => pr.pull_request && pr.number !== issueNumber,
  );

  // Update issue in database
  const dbIssue = await prisma.issue.findFirst({
    where: {
      feedback: {
        projectId,
      },
      githubIssueId: issueNumber,
    },
  });

  if (dbIssue) {
    await prisma.issue.update({
      where: { id: dbIssue.id },
      data: {
        state: issue.state,
        assignees: issue.assignees?.map((a) => a.login) || [],
        labels: issue.labels
          .filter(
            (l): l is { name: string } => typeof l === "object" && "name" in l,
          )
          .map((l) => l.name),
        commentsCount: comments.length,
        prsCount: linkedPRs.length,
        syncedAt: new Date(),
      },
    });

    // Add activities for new comments
    for (const comment of comments) {
      const existing = await prisma.issueActivity.findFirst({
        where: {
          issueId: dbIssue.id,
          type: "comment",
          metadata: JSON.stringify({ id: comment.id }),
        },
      });

      if (!existing) {
        await prisma.issueActivity.create({
          data: {
            issueId: dbIssue.id,
            type: "comment",
            actor: comment.user?.login || null,
            content: comment.body || null,
            metadata: JSON.stringify({ id: comment.id }),
          },
        });
      }
    }
  }

  return { issue, comments, prs: linkedPRs };
}

/**
 * Check if a webhook exists for the repository pointing to our webhook URL
 */
// Legacy per-repo webhook management (create/verify/deliveries) removed.
