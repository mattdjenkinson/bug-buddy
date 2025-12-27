"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { closeGitHubIssue } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const closeIssueSchema = z.object({
  issueId: z.string(),
});

export async function closeIssue(data: z.infer<typeof closeIssueSchema>) {
  try {
    const session = await requireAuth();
    const validated = closeIssueSchema.parse(data);

    // Get issue with project
    const issue = await prisma.issue.findUnique({
      where: { id: validated.issueId },
      include: {
        feedback: {
          include: {
            project: {
              include: {
                githubIntegration: true,
                user: true,
              },
            },
          },
        },
      },
    });

    if (!issue) {
      return { success: false, error: "Issue not found" };
    }

    // Verify user owns the project
    if (issue.feedback.project.userId !== session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (!issue.feedback.project.githubIntegration) {
      return {
        success: false,
        error: "GitHub integration not configured",
      };
    }

    // Close GitHub issue
    await closeGitHubIssue(issue.feedback.projectId, issue.githubIssueId);

    // Update issue in database
    const updatedIssue = await prisma.issue.update({
      where: { id: validated.issueId },
      data: {
        state: "closed",
        syncedAt: new Date(),
      },
    });

    // Update feedback status
    await prisma.feedback.update({
      where: { id: issue.feedbackId },
      data: { status: "closed" },
    });

    // Add activity
    await prisma.issueActivity.create({
      data: {
        issueId: issue.id,
        type: "state_change",
        actor: session.user.email || null,
        content: "Issue closed",
        metadata: JSON.stringify({ state: "closed" }),
      },
    });

    // Revalidate the feedback detail page
    revalidatePath(`/dashboard/feedback/${issue.feedbackId}`, "page");
    revalidatePath("/dashboard/feedback", "layout");

    return { success: true, issue: updatedIssue };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error closing GitHub issue:", error);
    return {
      success: false,
      error: "Failed to close issue",
      details: String(error),
    };
  }
}
