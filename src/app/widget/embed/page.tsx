import { getBaseUrl } from "@/lib/base-url";
import { getGitHubClient } from "@/lib/github";
import { getSecretKeyForProject } from "@/server/actions/widget/get-secret-key";
import { getProjectByApiKey } from "@/server/services/projects.service";
import WidgetEmbedPageContent from "./widget-embed-content";

interface WidgetEmbedPageProps {
  searchParams: Promise<{ projectKey?: string; url?: string }>;
}

export default async function WidgetEmbedPage({
  searchParams: searchParamsPromise,
}: WidgetEmbedPageProps) {
  const params = await searchParamsPromise;
  const projectKey = params.projectKey || "";
  const url = params.url || "";
  const secretKey = projectKey
    ? await getSecretKeyForProject(projectKey)
    : null;
  const baseUrl = await getBaseUrl();

  // Check if GitHub integration exists and if repo is public
  let githubIntegration: {
    repositoryOwner: string;
    repositoryName: string;
    isPublic: boolean;
  } | null = null;

  if (projectKey) {
    const project = await getProjectByApiKey(projectKey);
    if (project?.githubIntegration) {
      try {
        // Try to get GitHub client to check repo visibility
        const octokit = await getGitHubClient(project.id);
        const { data: repo } = await octokit.rest.repos.get({
          owner: project.githubIntegration.repositoryOwner,
          repo: project.githubIntegration.repositoryName,
        });
        githubIntegration = {
          repositoryOwner: project.githubIntegration.repositoryOwner,
          repositoryName: project.githubIntegration.repositoryName,
          isPublic: !repo.private,
        };
      } catch {
        // If we can't check (e.g., no auth), assume private for safety
        githubIntegration = null;
      }
    }
  }

  return (
    <WidgetEmbedPageContent
      projectKey={projectKey}
      url={url}
      secretKey={secretKey}
      baseUrl={baseUrl}
      githubIntegration={githubIntegration}
    />
  );
}
