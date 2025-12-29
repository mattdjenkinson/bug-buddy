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

    const allowedDomains =
      (project as { allowedDomains?: string[] }).allowedDomains || [];

    // If allowed domains are configured, check the origin
    if (allowedDomains.length > 0) {
      // Require origin header when domains are restricted
      if (!origin) {
        return NextResponse.json(
          { error: "Origin header required" },
          {
            status: 403,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          },
        );
      }
      const originUrl = new URL(origin);
      // For localhost, preserve the port; for others, use hostname only
      const isLocalhost =
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1";
      const originHost = isLocalhost ? originUrl.host : originUrl.hostname;

      // Check if origin matches any allowed domain
      const isAllowed = allowedDomains.some((domain: string) => {
        // Remove protocol if present
        const cleanDomain = domain
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "");
        // Support exact match or subdomain match

        return (
          originHost === cleanDomain || originHost.endsWith(`.${cleanDomain}`)
        );
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: "Domain not allowed" },
          {
            status: 403,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          },
        );
      }
    }

    // Determine CORS header - use origin if allowed, otherwise allow all
    const corsOrigin = allowedDomains.length > 0 && origin ? origin : "*";

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
