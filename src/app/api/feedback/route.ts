import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import type { FeedbackWhereInput } from "@/server/prisma/generated/prisma/models";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const where: FeedbackWhereInput = {
      project: {
        userId: session.user.id,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    const feedback = await prisma.feedback.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        issue: {
          select: {
            id: true,
            githubIssueId: true,
            githubIssueUrl: true,
            state: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
