import { syncIssueFromGitHub } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const event = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");

    // Find integration by repository (from webhook payload)
    const { repository } = body;
    if (!repository) {
      return NextResponse.json(
        { message: "Repository information missing" },
        { status: 400 },
      );
    }

    const integration = await prisma.gitHubIntegration.findFirst({
      where: {
        repositoryOwner: repository.owner.login,
        repositoryName: repository.name,
      },
      include: {
        project: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { message: "Integration not found" },
        { status: 404 },
      );
    }

    // Verify webhook signature - if secret is configured, signature is required
    if (integration.webhookSecret) {
      if (!signature) {
        console.error("GitHub Webhook: Signature is missing");
        return NextResponse.json(
          { message: "Missing signature" },
          { status: 401 },
        );
      }

      // GitHub sends signature as "sha256=<hash>"
      const expectedSignature = `sha256=${createHmac(
        "sha256",
        integration.webhookSecret,
      )
        .update(rawBody)
        .digest("hex")}`;

      // Use timing-safe comparison to prevent timing attacks
      if (signature.length !== expectedSignature.length) {
        console.error("GitHub Webhook: Invalid signature");
        return NextResponse.json(
          { message: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    if (event === "issues") {
      const { action, issue } = body;

      // Find issue in database
      const dbIssue = await prisma.issue.findFirst({
        where: {
          githubIssueId: issue.number,
          feedback: {
            projectId: integration.projectId,
          },
        },
        include: {
          feedback: {
            include: {
              project: true,
            },
          },
        },
      });

      if (dbIssue) {
        // Sync issue data
        await syncIssueFromGitHub(integration.projectId, issue.number);

        // Add activity for state changes
        if (action === "closed" || action === "reopened") {
          await prisma.issueActivity.create({
            data: {
              issueId: dbIssue.id,
              type: "state_change",
              actor: issue.user?.login || null,
              content: `Issue ${action}`,
              metadata: JSON.stringify({ state: issue.state }),
            },
          });

          // Create notification for the project owner
          await prisma.notification.create({
            data: {
              userId: dbIssue.feedback.project.userId,
              issueId: dbIssue.id,
              type: "issue_state_change",
              title: `Issue ${action === "closed" ? "closed" : "reopened"}`,
              message: `Issue #${issue.number} in ${integration.repositoryOwner}/${integration.repositoryName} was ${action}${issue.user?.login ? ` by ${issue.user.login}` : ""}`,
            },
          });
        }

        // Update feedback status
        if (action === "closed") {
          await prisma.feedback.update({
            where: { id: dbIssue.feedbackId },
            data: { status: "closed" },
          });
        } else if (action === "reopened") {
          await prisma.feedback.update({
            where: { id: dbIssue.feedbackId },
            data: { status: "open" },
          });
        }
      }
    } else if (event === "issue_comment") {
      const { action, issue, comment } = body;

      // Find issue in database
      const dbIssue = await prisma.issue.findFirst({
        where: {
          githubIssueId: issue.number,
          feedback: {
            projectId: integration.projectId,
          },
        },
        include: {
          feedback: {
            include: {
              project: true,
            },
          },
        },
      });

      if (dbIssue && action === "created") {
        // Add comment activity
        await prisma.issueActivity.create({
          data: {
            issueId: dbIssue.id,
            type: "comment",
            actor: comment.user?.login || null,
            content: comment.body || null,
            metadata: JSON.stringify({ id: comment.id }),
          },
        });

        // Update comment count
        await prisma.issue.update({
          where: { id: dbIssue.id },
          data: {
            commentsCount: {
              increment: 1,
            },
          },
        });

        // Create notification for the project owner
        await prisma.notification.create({
          data: {
            userId: dbIssue.feedback.project.userId,
            issueId: dbIssue.id,
            type: "issue_comment",
            title: "New comment on issue",
            message: `${comment.user?.login || "Someone"} commented on issue #${issue.number} in ${integration.repositoryOwner}/${integration.repositoryName}`,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
