"use server";

import { createGitHubIssue } from "@/lib/github";
import { getPostHogClient, shutdownPostHog } from "@/lib/posthog-server";
import { prisma } from "@/lib/prisma";
import { combinedRatelimit, getClientIP } from "@/lib/rate-limit";
import { widgetSubmitSchema } from "@/lib/schemas";
import {
  validateDomainForAction,
  validateSecretKeyForAction,
} from "@/lib/widget-api-helpers";
import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import { z } from "zod";

function parseUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return "";
  }

  try {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    const parts: string[] = [];

    if (browser.name) {
      const browserStr = browser.version
        ? `${browser.name} ${browser.version}`
        : browser.name;
      parts.push(`**Browser:** ${browserStr}`);
    }

    if (os.name) {
      const osStr = os.version ? `${os.name} ${os.version}` : os.name;
      parts.push(`**OS:** ${osStr}`);
    }

    if (device.model || device.type) {
      const deviceParts: string[] = [];
      if (device.vendor) {
        deviceParts.push(device.vendor);
      }
      if (device.model) {
        deviceParts.push(device.model);
      } else if (device.type) {
        deviceParts.push(device.type);
      }
      if (deviceParts.length > 0) {
        parts.push(`**Device:** ${deviceParts.join(" ")}`);
      }
    }

    return parts.length > 0 ? parts.join("\n") : "";
  } catch (error) {
    console.error("Error parsing user agent:", error);
    return "";
  }
}

export async function submitWidgetFeedback(data: {
  projectKey: string;
  secretKey: string;
  title: string;
  description: string;
  screenshot: string;
  annotations?: string;
  userName?: string;
  userEmail?: string;
  githubUsername?: string;
  url?: string;
  userAgent?: string;
  deviceInfo?: {
    deviceType?: string;
    browser?: string;
    screenSize?: { width: number; height: number };
    viewportSize?: { width: number; height: number };
    os?: string;
    zoomLevel?: number;
    pixelRatio?: number;
  };
}) {
  try {
    const validated = widgetSubmitSchema.parse(data);

    const clientIP = await getClientIP();

    const combinedLimit = await combinedRatelimit.limit(
      `ip:${clientIP}:project:${validated.projectKey}`,
    );

    if (!combinedLimit.success) {
      console.info("Rate limit exceeded:", {
        ip: clientIP,
        projectKey: validated.projectKey,
        limit: combinedLimit.limit,
        remaining: combinedLimit.remaining,
        reset: combinedLimit.reset,
      });

      after(() => {
        getPostHogClient().capture({
          distinctId: validated.projectKey,
          event: "rate_limit_exceeded",
          properties: {
            ip: clientIP,
            projectKey: validated.projectKey,
          },
        });

        shutdownPostHog();
      });
      return {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      };
    }

    // Validate domain first (if configured)
    const domainValidation = await validateDomainForAction(
      validated.projectKey,
    );
    if (!domainValidation.isValid) {
      return {
        success: false,
        error: domainValidation.error || "Domain not allowed",
      };
    }

    // Validate secret key
    const validation = await validateSecretKeyForAction(
      validated.projectKey,
      validated.secretKey,
    );
    if (!validation.isValid) {
      return {
        success: false,
        error: "Invalid secret key",
      };
    }

    // Find project by API key (with relations)
    const project = await prisma.project.findUnique({
      where: { apiKey: validated.projectKey },
      include: {
        githubIntegration: true,
      },
    });

    if (!project) {
      return {
        success: false,
        error: "Invalid project key",
      };
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        projectId: project.id,
        title: validated.title,
        description: validated.description,
        screenshot: validated.screenshot,
        annotations: validated.annotations || null,
        userName: validated.userName || null,
        userEmail: validated.userEmail || null,
        url: validated.url || null,
        userAgent: validated.userAgent || null,
        deviceInfo: validated.deviceInfo,
        status: "open",
      },
    });

    // Trigger GitHub issue creation after response is sent
    if (project.githubIntegration) {
      // Capture values before the callback to avoid TypeScript null check issues
      const githubIntegration = project.githubIntegration;
      const projectId = project.id;
      const feedbackTitle = feedback.title;
      const feedbackDescription = feedback.description;
      const feedbackUserName = feedback.userName;
      const feedbackUrl = feedback.url;
      const feedbackScreenshot = feedback.screenshot;
      const feedbackAnnotations = feedback.annotations;
      const feedbackUserAgent = feedback.userAgent;
      const feedbackDeviceInfo = feedback.deviceInfo as {
        deviceType?: string;
        browser?: string;
        screenSize?: { width: number; height: number };
        viewportSize?: { width: number; height: number };
        os?: string;
        zoomLevel?: number;
        pixelRatio?: number;
      } | null;
      const feedbackId = feedback.id;
      const githubUsername = validated.githubUsername;

      // Defer GitHub issue creation - don't await, let it run in background
      void (async () => {
        try {
          // Parse user agent to get browser and OS info
          const userAgentInfo = parseUserAgent(feedbackUserAgent);

          // Format device info for GitHub issue as a markdown table
          let deviceInfoSection = "";
          if (feedbackDeviceInfo) {
            const rows: string[] = [];
            if (feedbackDeviceInfo.deviceType) {
              rows.push(`| Device Type | ${feedbackDeviceInfo.deviceType} |`);
            }
            if (feedbackDeviceInfo.browser) {
              rows.push(`| Browser | ${feedbackDeviceInfo.browser} |`);
            }
            if (feedbackDeviceInfo.os) {
              rows.push(`| OS | ${feedbackDeviceInfo.os} |`);
            }
            if (feedbackDeviceInfo.screenSize) {
              rows.push(
                `| Screen Size | ${feedbackDeviceInfo.screenSize.width} x ${feedbackDeviceInfo.screenSize.height} |`,
              );
            }
            if (feedbackDeviceInfo.viewportSize) {
              rows.push(
                `| Viewport Size | ${feedbackDeviceInfo.viewportSize.width} x ${feedbackDeviceInfo.viewportSize.height} |`,
              );
            }
            if (feedbackDeviceInfo.zoomLevel !== undefined) {
              rows.push(`| Zoom Level | ${feedbackDeviceInfo.zoomLevel}% |`);
            }
            if (feedbackDeviceInfo.pixelRatio !== undefined) {
              rows.push(`| Pixel Ratio | ${feedbackDeviceInfo.pixelRatio}x |`);
            }
            if (rows.length > 0) {
              deviceInfoSection = `\n### Device Information\n\n| Property | Value |\n|----------|-------|\n${rows.join("\n")}`;
            }
          }

          // Parse and format annotations
          let annotationsSection = "";
          if (feedbackAnnotations) {
            try {
              const parsedAnnotations = JSON.parse(feedbackAnnotations);
              if (
                Array.isArray(parsedAnnotations) &&
                parsedAnnotations.length > 0
              ) {
                const annotationItems = parsedAnnotations
                  .map(
                    (ann: {
                      number: number;
                      text: string;
                      x: number;
                      y: number;
                    }) =>
                      ann.text
                        ? `${ann.number}. ${ann.text}`
                        : `${ann.number}.`,
                  )
                  .join("\n");
                annotationsSection = `\n### Annotations\n\n${annotationItems}`;
              }
            } catch {
              // If parsing fails, fall back to showing raw JSON
              annotationsSection = `\n### Annotations\n\`\`\`json\n${feedbackAnnotations}\n\`\`\``;
            }
          }

          // Create issue body
          const githubMention = githubUsername
            ? `\n\n@${githubUsername} - You'll be notified of updates to this issue.`
            : "";

          // Check if screenshot is a base64 data URL (too large for GitHub)
          const isDataUrl = feedbackScreenshot.startsWith("data:image/");
          const screenshotSection = isDataUrl
            ? `### Screenshot\n\n⚠️ Screenshot is too large to embed directly. Please view it in the Bug Buddy dashboard.\n\n[Screenshot URL](${feedbackScreenshot.substring(0, 200)}...)`
            : `### Screenshot\n\n![Screenshot](${feedbackScreenshot})`;

          let issueBody = `## Feedback Details

${feedbackDescription}

${feedbackUserName ? `**Reported by:** ${feedbackUserName}` : ""}
${feedbackUrl ? `**URL:** ${feedbackUrl}` : ""}
${userAgentInfo ? `\n### Environment\n${userAgentInfo}` : ""}${deviceInfoSection}

${screenshotSection}${annotationsSection}${githubMention}

---

_Created by [Bug Buddy](https://bugbuddy.dev)_
`;

          // GitHub has a 65,536 character limit for issue body
          // If body is too long, truncate it and add a note
          const maxBodyLength = 60000; // Leave some buffer
          if (issueBody.length > maxBodyLength) {
            const truncatedBody = issueBody.substring(0, maxBodyLength);
            const truncatedNote = `\n\n---\n\n⚠️ _Issue body was truncated due to length. Full details available in Bug Buddy dashboard._`;
            issueBody = truncatedBody + truncatedNote;
          }

          const githubIssue = await createGitHubIssue(
            projectId,
            feedbackTitle || "Feedback Submission",
            issueBody,
            githubIntegration.defaultLabels,
            githubIntegration.defaultAssignees,
          );

          // Create issue record in database
          await prisma.issue.create({
            data: {
              feedbackId: feedbackId,
              githubIssueId: githubIssue.number,
              githubIssueUrl: githubIssue.html_url,
              title: githubIssue.title,
              body: githubIssue.body || "",
              state: githubIssue.state,
              assignees: githubIssue.assignees?.map((a) => a.login) || [],
              labels: githubIssue.labels
                .filter(
                  (l): l is { name: string } =>
                    typeof l === "object" && "name" in l,
                )
                .map((l) => l.name),
            },
          });
        } catch (error) {
          console.error("Error creating GitHub issue:", error);
          // Don't fail the feedback submission if GitHub issue creation fails
        }
      })();
    }

    getPostHogClient().capture({
      distinctId: project.id,
      event: "widget_feedback_submitted",
      properties: {
        projectId: project.id,
        feedbackId: feedback.id,
      },
    });

    return {
      success: true,
      feedbackId: feedback.id,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format(),
      };
    }

    console.error("Error submitting feedback:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}
