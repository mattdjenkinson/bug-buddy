"use server";

import { createGitHubIssue } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { widgetSubmitSchema } from "@/lib/schemas";
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
        status: "open",
      },
    });

    // Trigger GitHub issue creation (async, don't wait)
    if (project.githubIntegration) {
      // Parse user agent to get browser and OS info
      const userAgentInfo = parseUserAgent(feedback.userAgent);

      // Create issue body
      const issueBody = `## Feedback Details

${feedback.description}

${feedback.userName ? `**Reported by:** ${feedback.userName}` : ""}
${feedback.url ? `**URL:** ${feedback.url}` : ""}
${userAgentInfo ? `\n### Environment\n${userAgentInfo}` : ""}

### Screenshot
![Screenshot](${feedback.screenshot})

${feedback.annotations ? `\n### Annotations\n\`\`\`json\n${feedback.annotations}\n\`\`\`` : ""}

---

_Created by [Bug Buddy](https://bugbuddy.dev)_
`;

      // Create GitHub issue asynchronously (don't block the response)
      createGitHubIssue(
        project.id,
        feedback.title || "Feedback Submission",
        issueBody,
        project.githubIntegration.defaultLabels,
        project.githubIntegration.defaultAssignees,
      )
        .then(async (githubIssue) => {
          // Create issue record in database
          await prisma.issue.create({
            data: {
              feedbackId: feedback.id,
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
        })
        .catch((error) => {
          console.error("Error creating GitHub issue:", error);
          // Don't fail the feedback submission if GitHub issue creation fails
        });
    }

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
