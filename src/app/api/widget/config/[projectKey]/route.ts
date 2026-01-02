import { getGitHubClient } from "@/lib/github";
import { getProjectByApiKey } from "@/server/services/projects.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  try {
    const { projectKey } = await params;

    const project = await getProjectByApiKey(projectKey);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        },
      );
    }

    // Check if origin is allowed
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    const allowedDomains =
      (project as { allowedDomains?: string[] }).allowedDomains || [];

    // If allowed domains are configured, check the origin or referer
    if (allowedDomains.length > 0) {
      // Try to get the requesting domain from origin or referer
      let requestHost: string | null = null;

      if (origin) {
        try {
          const originUrl = new URL(origin);
          // For localhost, preserve the port; for others, use hostname only
          const isLocalhost =
            originUrl.hostname === "localhost" ||
            originUrl.hostname === "127.0.0.1";
          requestHost = isLocalhost ? originUrl.host : originUrl.hostname;
        } catch {
          // Invalid origin URL, ignore
        }
      } else if (referer) {
        try {
          const refererUrl = new URL(referer);
          const isLocalhost =
            refererUrl.hostname === "localhost" ||
            refererUrl.hostname === "127.0.0.1";
          requestHost = isLocalhost ? refererUrl.host : refererUrl.hostname;
        } catch {
          // Invalid referer URL, ignore
        }
      }

      // If we couldn't determine the requesting domain, reject the request
      if (!requestHost) {
        return NextResponse.json(
          { error: "Origin or Referer header required" },
          {
            status: 403,
            headers: {
              "Access-Control-Allow-Origin": origin || "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          },
        );
      }

      // Always allow localhost for development
      const isLocalhost =
        requestHost === "localhost" ||
        requestHost.startsWith("localhost:") ||
        requestHost === "127.0.0.1" ||
        requestHost.startsWith("127.0.0.1:");

      // Check if origin/referer matches any allowed domain (skip check for localhost)
      if (!isLocalhost) {
        const isAllowed = allowedDomains.some((domain: string) => {
          // Remove protocol if present
          const cleanDomain = domain
            .replace(/^https?:\/\//, "")
            .replace(/\/$/, "");
          // Support exact match or subdomain match
          return (
            requestHost === cleanDomain ||
            requestHost.endsWith(`.${cleanDomain}`)
          );
        });

        if (!isAllowed) {
          return NextResponse.json(
            { error: "Domain not allowed" },
            {
              status: 403,
              headers: {
                "Access-Control-Allow-Origin": origin || "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
              },
            },
          );
        }
      }
    }

    // Determine CORS header - use origin if allowed, otherwise allow all
    const corsOrigin = allowedDomains.length > 0 && origin ? origin : "*";

    // Check if GitHub integration exists and if repo is public
    let isPublicRepo = false;
    if (project.githubIntegration) {
      try {
        // Try to get GitHub client to check repo visibility
        const octokit = await getGitHubClient(project.id);
        const { data: repo } = await octokit.rest.repos.get({
          owner: project.githubIntegration.repositoryOwner,
          repo: project.githubIntegration.repositoryName,
        });
        isPublicRepo = !repo.private;
      } catch {
        // If we can't check (e.g., no auth), assume private for safety
        // We could also try without auth for public repos, but this is safer
        isPublicRepo = false;
      }
    }

    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
        },
        customization: project.widgetCustomization
          ? {
              primaryColor: project.widgetCustomization.primaryColor,
              secondaryColor: project.widgetCustomization.secondaryColor,
              fontFamily: project.widgetCustomization.fontFamily,
              fontUrl: project.widgetCustomization.fontUrl,
              fontFileName: project.widgetCustomization.fontFileName,
              borderRadius: project.widgetCustomization.borderRadius,
              buttonText: project.widgetCustomization.buttonText,
              buttonPosition: project.widgetCustomization.buttonPosition,
            }
          : null,
        githubIntegration:
          project.githubIntegration && isPublicRepo
            ? {
                repositoryOwner: project.githubIntegration.repositoryOwner,
                repositoryName: project.githubIntegration.repositoryName,
                isPublic: true,
              }
            : null,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching widget config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
