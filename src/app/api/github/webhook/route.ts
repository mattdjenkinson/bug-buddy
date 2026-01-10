import { serverEnv } from "@/env";
import { syncIssueFromGitHub } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const event = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");

    // GitHub App webhook security: always verify signature using global secret.
    if (!serverEnv.GITHUB_APP_WEBHOOK_SECRET) {
      console.error("GitHub Webhook: Missing GITHUB_APP_WEBHOOK_SECRET");
      return NextResponse.json(
        { message: "Webhook secret not configured" },
        { status: 500 },
      );
    }

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
      serverEnv.GITHUB_APP_WEBHOOK_SECRET,
    )
      .update(rawBody)
      .digest("hex")}`;

    if (
      signature.length !== expectedSignature.length ||
      !timingSafeEqual(
        Buffer.from(signature, "utf8"),
        Buffer.from(expectedSignature, "utf8"),
      )
    ) {
      console.error("GitHub Webhook: Invalid signature");
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 },
      );
    }

    // A ping is sent when configuring the webhook; accept it after verification.
    if (event === "ping") {
      return NextResponse.json({ success: true });
    }

    const { repository } = body;
    const repoOwner = repository?.owner?.login as string | undefined;
    const repoName = repository?.name as string | undefined;
    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { message: "Repository information missing" },
        { status: 400 },
      );
    }

    const integrations = await prisma.gitHubIntegration.findMany({
      where: { repositoryOwner: repoOwner, repositoryName: repoName },
      select: { projectId: true },
    });
    const projectIds = integrations.map((i) => i.projectId);

    if (event === "issues") {
      const { action, issue } = body;

      if (!projectIds.length) {
        // No project is tracking this repository.
        return NextResponse.json({ success: true });
      }

      // Find issue in database
      const dbIssue = await prisma.issue.findFirst({
        where: {
          githubIssueId: issue.number,
          feedback: {
            projectId: { in: projectIds },
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
        await syncIssueFromGitHub(dbIssue.feedback.projectId, issue.number);

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
              message: `Issue #${issue.number} in ${repoOwner}/${repoName} was ${action}${issue.user?.login ? ` by ${issue.user.login}` : ""}`,
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

      if (!projectIds.length) {
        return NextResponse.json({ success: true });
      }

      // Find issue in database
      const dbIssue = await prisma.issue.findFirst({
        where: {
          githubIssueId: issue.number,
          feedback: {
            projectId: { in: projectIds },
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
            message: `${comment.user?.login || "Someone"} commented on issue #${issue.number} in ${repoOwner}/${repoName}`,
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
