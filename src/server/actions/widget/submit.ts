"use server";

import { createGitHubIssue } from "@/lib/github";
import { getPostHogClient } from "@/lib/posthog-server";
import { prisma } from "@/lib/prisma";
import { widgetSubmitSchema } from "@/lib/schemas";
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

export async function submitFeedback(data: z.infer<typeof widgetSubmitSchema>) {
  try {
    const validated = widgetSubmitSchema.parse(data);

    // Find project by API key
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

      after(async () => {
        try {
          // Parse user agent to get browser and OS info
          const userAgentInfo = parseUserAgent(feedbackUserAgent);

          // Format device info for GitHub issue
          let deviceInfoSection = "";
          if (feedbackDeviceInfo) {
            const parts: string[] = [];
            if (feedbackDeviceInfo.deviceType) {
              parts.push(`**Device type:** ${feedbackDeviceInfo.deviceType}`);
            }
            if (feedbackDeviceInfo.browser) {
              parts.push(`**Browser:** ${feedbackDeviceInfo.browser}`);
            }
            if (feedbackDeviceInfo.screenSize) {
              parts.push(
                `**Screen Size:** ${feedbackDeviceInfo.screenSize.width} x ${feedbackDeviceInfo.screenSize.height}`,
              );
            }
            if (feedbackDeviceInfo.os) {
              parts.push(`**OS:** ${feedbackDeviceInfo.os}`);
            }
            if (feedbackDeviceInfo.viewportSize) {
              parts.push(
                `**Viewport Size:** ${feedbackDeviceInfo.viewportSize.width} x ${feedbackDeviceInfo.viewportSize.height}`,
              );
            }
            if (feedbackDeviceInfo.zoomLevel !== undefined) {
              parts.push(`**Zoom Level:** ${feedbackDeviceInfo.zoomLevel}%`);
            }
            if (feedbackDeviceInfo.pixelRatio !== undefined) {
              parts.push(`**Pixel Ratio:** @${feedbackDeviceInfo.pixelRatio}x`);
            }
            if (parts.length > 0) {
              deviceInfoSection = `\n### Device Information\n${parts.join("\n")}`;
            }
          }

          // Create issue body
          const issueBody = `## Feedback Details

${feedbackDescription}

${feedbackUserName ? `**Reported by:** ${feedbackUserName}` : ""}
${feedbackUrl ? `**URL:** ${feedbackUrl}` : ""}
${userAgentInfo ? `\n### Environment\n${userAgentInfo}` : ""}${deviceInfoSection}

### Screenshot
![Screenshot](${feedbackScreenshot})

${feedbackAnnotations ? `\n### Annotations\n\`\`\`json\n${feedbackAnnotations}\n\`\`\`` : ""}

---

_Created by [Bug Buddy](https://bugbuddy.dev)_
`;

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
      });
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
