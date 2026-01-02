/* eslint-disable @typescript-eslint/no-explicit-any */
import { Octokit } from "@octokit/rest";
import { getBaseUrl } from "./base-url";
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

  // Use Personal Access Token if available
  if (integration.personalAccessToken) {
    return new Octokit({
      auth: integration.personalAccessToken,
    });
  }

  // Otherwise, try to use user's GitHub OAuth token
  const account = await prisma.account.findFirst({
    where: {
      userId: integration.project.userId,
      providerId: "github",
    },
  });

  if (account?.accessToken) {
    return new Octokit({
      auth: account.accessToken,
    });
  }

  // Otherwise use GitHub App (requires more setup)
  if (
    integration.appId &&
    integration.installationId &&
    integration.privateKey
  ) {
    // This would require @octokit/auth-app
    // For now, we'll use PAT approach
    throw new Error(
      "GitHub App authentication not yet implemented. Please use Personal Access Token or ensure you're signed in with GitHub.",
    );
  }

  throw new Error(
    "No GitHub authentication configured. Please provide a Personal Access Token or ensure you're signed in with GitHub.",
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
export async function checkWebhookExists(projectId: string): Promise<{
  exists: boolean;
  webhookId?: number;
  error?: string;
}> {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
  });

  if (!integration) {
    return { exists: false, error: "GitHub integration not found" };
  }

  const octokit = await getGitHubClient(projectId);
  const baseUrl = await getBaseUrl();
  const webhookUrl = `${baseUrl}/api/github/webhook`;

  try {
    // List all webhooks for the repository
    const { data: hooks } = await octokit.rest.repos.listWebhooks({
      owner: integration.repositoryOwner,
      repo: integration.repositoryName,
    });

    // Check if any webhook points to our URL
    const matchingHook = hooks.find(
      (hook) => hook.config.url && hook.config.url === webhookUrl,
    );

    if (matchingHook) {
      return { exists: true, webhookId: matchingHook.id };
    }

    return { exists: false };
  } catch (error: any) {
    if (error.status === 404) {
      return {
        exists: false,
        error: `Repository ${integration.repositoryOwner}/${integration.repositoryName} not found`,
      };
    }
    if (error.status === 403) {
      return {
        exists: false,
        error: `Permission denied. Your GitHub token needs 'admin:repo_hook' scope to manage webhooks.`,
      };
    }
    return {
      exists: false,
      error: `Failed to check webhook: ${error.message || "Unknown error"}`,
    };
  }
}

/**
 * Create a webhook for the repository
 */
export async function createWebhook(projectId: string): Promise<{
  success: boolean;
  webhookId?: number;
  error?: string;
}> {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
  });

  if (!integration) {
    return { success: false, error: "GitHub integration not found" };
  }

  // Ensure webhook secret exists
  if (!integration.webhookSecret) {
    return {
      success: false,
      error:
        "Webhook secret not configured. Please generate a webhook secret first.",
    };
  }

  const octokit = await getGitHubClient(projectId);
  const baseUrl = await getBaseUrl();
  const webhookUrl = `${baseUrl}/api/github/webhook`;

  try {
    // Check if webhook already exists
    const existingCheck = await checkWebhookExists(projectId);
    if (existingCheck.exists && existingCheck.webhookId) {
      // Update the webhook ID in database if it's not set
      // Note: webhookId field will be available after Prisma client regeneration
      if (!(integration as any).webhookId) {
        await prisma.gitHubIntegration.update({
          where: { projectId },
          data: { webhookId: existingCheck.webhookId } as any,
        });
      }
      return {
        success: true,
        webhookId: existingCheck.webhookId,
      };
    }

    // Create new webhook
    const { data: webhook } = await octokit.rest.repos.createWebhook({
      owner: integration.repositoryOwner,
      repo: integration.repositoryName,
      config: {
        url: webhookUrl,
        content_type: "json",
        secret: integration.webhookSecret,
        insecure_ssl: "0", // Require SSL
      },
      events: ["issues", "issue_comment"],
      active: true,
    });

    // Update integration with webhook ID
    // Note: webhookId field will be available after Prisma client regeneration
    await prisma.gitHubIntegration.update({
      where: { projectId },
      data: { webhookId: webhook.id } as any,
    });

    return { success: true, webhookId: webhook.id };
  } catch (error: any) {
    if (error.status === 404) {
      return {
        success: false,
        error: `Repository ${integration.repositoryOwner}/${integration.repositoryName} not found`,
      };
    }
    if (error.status === 403) {
      return {
        success: false,
        error: `Permission denied. Your GitHub token needs 'admin:repo_hook' scope to create webhooks. Please provide a Personal Access Token with admin:repo_hook permissions.`,
      };
    }
    if (error.status === 422) {
      // Webhook might already exist with different config
      const errorMessage = error.message || "";
      if (errorMessage.includes("already exists")) {
        // Try to find and update existing webhook
        const existingCheck = await checkWebhookExists(projectId);
        if (existingCheck.exists && existingCheck.webhookId) {
          await prisma.gitHubIntegration.update({
            where: { projectId },
            data: { webhookId: existingCheck.webhookId },
          });
          return {
            success: true,
            webhookId: existingCheck.webhookId,
          };
        }
      }
      return {
        success: false,
        error: `Failed to create webhook: ${errorMessage}`,
      };
    }
    return {
      success: false,
      error: `Failed to create webhook: ${error.message || "Unknown error"}`,
    };
  }
}

/**
 * Verify webhook status - check if it exists and is properly configured
 */
export async function verifyWebhookStatus(projectId: string): Promise<{
  configured: boolean;
  webhookId?: number;
  error?: string;
  details?: {
    url: string;
    events: string[];
    active: boolean;
  };
}> {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
  });

  if (!integration) {
    return { configured: false, error: "GitHub integration not found" };
  }

  const octokit = await getGitHubClient(projectId);
  const baseUrl = await getBaseUrl();
  const webhookUrl = `${baseUrl}/api/github/webhook`;

  try {
    // If we have a webhook ID, try to get that specific webhook
    // Note: webhookId field will be available after Prisma client regeneration
    if ((integration as any).webhookId) {
      try {
        const { data: webhook } = await octokit.rest.repos.getWebhook({
          owner: integration.repositoryOwner,
          repo: integration.repositoryName,
          hook_id: (integration as any).webhookId,
        });

        const isCorrectUrl = webhook.config.url === webhookUrl;
        const hasCorrectEvents =
          webhook.events.includes("issues") &&
          webhook.events.includes("issue_comment");

        return {
          configured: isCorrectUrl && hasCorrectEvents && webhook.active,
          webhookId: webhook.id,
          details: {
            url: webhook.config.url || "",
            events: webhook.events,
            active: webhook.active,
          },
          ...(isCorrectUrl && hasCorrectEvents && webhook.active
            ? {}
            : {
                error: isCorrectUrl
                  ? hasCorrectEvents
                    ? "Webhook is not active"
                    : "Webhook events are not correctly configured"
                  : "Webhook URL does not match",
              }),
        };
      } catch (error: any) {
        if (error.status === 404) {
          // Webhook was deleted, clear the ID
          // Note: webhookId field will be available after Prisma client regeneration
          await prisma.gitHubIntegration.update({
            where: { projectId },
            data: { webhookId: null } as any,
          });
          // Fall through to check all webhooks
        } else {
          throw error;
        }
      }
    }

    // Check all webhooks to find a matching one
    const checkResult = await checkWebhookExists(projectId);
    if (checkResult.exists && checkResult.webhookId) {
      // Update the webhook ID if it wasn't set
      // Note: webhookId field will be available after Prisma client regeneration
      if (!(integration as any).webhookId) {
        await prisma.gitHubIntegration.update({
          where: { projectId },
          data: { webhookId: checkResult.webhookId } as any,
        });
      }

      // Get webhook details
      const { data: webhook } = await octokit.rest.repos.getWebhook({
        owner: integration.repositoryOwner,
        repo: integration.repositoryName,
        hook_id: checkResult.webhookId,
      });

      const hasCorrectEvents =
        webhook.events.includes("issues") &&
        webhook.events.includes("issue_comment");

      return {
        configured: hasCorrectEvents && webhook.active,
        webhookId: webhook.id,
        details: {
          url: webhook.config.url || "",
          events: webhook.events,
          active: webhook.active,
        },
        ...(hasCorrectEvents && webhook.active
          ? {}
          : {
              error: hasCorrectEvents
                ? "Webhook is not active"
                : "Webhook events are not correctly configured",
            }),
      };
    }

    return {
      configured: false,
      error: "No webhook found for this repository",
    };
  } catch (error: any) {
    if (error.status === 404) {
      return {
        configured: false,
        error: `Repository ${integration.repositoryOwner}/${integration.repositoryName} not found`,
      };
    }
    if (error.status === 403) {
      return {
        configured: false,
        error: `Permission denied. Your GitHub token needs 'admin:repo_hook' scope to verify webhooks.`,
      };
    }
    return {
      configured: false,
      error: `Failed to verify webhook: ${error.message || "Unknown error"}`,
    };
  }
}

/**
 * Get the last 5 webhook delivery events for a repository
 */
export async function getWebhookDeliveries(projectId: string): Promise<{
  success: boolean;
  deliveries?: Array<{
    id: number;
    guid: string;
    event: string;
    action: string | null;
    deliveredAt: Date;
    statusCode: number | null;
    status: string;
    duration: number;
    redelivery: boolean;
  }>;
  error?: string;
}> {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { projectId },
  });

  if (!integration) {
    return { success: false, error: "GitHub integration not found" };
  }

  const webhookId = (integration as any).webhookId;
  if (!webhookId) {
    return {
      success: false,
      error: "Webhook ID not found. Please ensure the webhook is configured.",
    };
  }

  const octokit = await getGitHubClient(projectId);

  try {
    const { data: deliveries } = await octokit.rest.repos.listWebhookDeliveries(
      {
        owner: integration.repositoryOwner,
        repo: integration.repositoryName,
        hook_id: webhookId,
        per_page: 5,
      },
    );

    const formattedDeliveries = deliveries.map((delivery) => ({
      id: delivery.id,
      guid: delivery.guid,
      event: delivery.event || "unknown",
      action: delivery.action || null,
      deliveredAt: new Date(delivery.delivered_at),
      statusCode: delivery.status_code || null,
      status: delivery.status || "unknown",
      duration: delivery.duration || 0,
      redelivery: delivery.redelivery || false,
    }));

    return { success: true, deliveries: formattedDeliveries };
  } catch (error: any) {
    if (error.status === 404) {
      return {
        success: false,
        error: `Repository ${integration.repositoryOwner}/${integration.repositoryName} or webhook not found`,
      };
    }
    if (error.status === 403) {
      return {
        success: false,
        error: `Permission denied. Your GitHub token needs 'admin:repo_hook' scope to view webhook deliveries.`,
      };
    }
    return {
      success: false,
      error: `Failed to fetch webhook deliveries: ${error.message || "Unknown error"}`,
    };
  }
}
