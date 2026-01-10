import { prisma } from "@/lib/prisma";
import type { FeedbackWhereInput } from "@/server/prisma/generated/prisma/models";

interface GetFeedbackOptions {
  userId: string;
  projectId?: string;
  status?: string;
  title?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
}

export async function getUserFeedback(options: GetFeedbackOptions) {
  const {
    userId,
    projectId,
    status,
    title,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit,
  } = options;

  // Build where clause for filtering
  const where: FeedbackWhereInput = {
    project: {
      userId,
    },
  };

  if (projectId && projectId !== "all") {
    where.projectId = projectId;
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (title) {
    where.OR = [
      { title: { contains: title, mode: "insensitive" } },
      { description: { contains: title, mode: "insensitive" } },
    ];
  }

  // Build orderBy clause for sorting
  let orderBy:
    | { createdAt?: "asc" | "desc" }
    | { title?: "asc" | "desc" }
    | { status?: "asc" | "desc" }
    | { project: { name: "asc" | "desc" } };
  if (sortBy === "project") {
    orderBy = { project: { name: sortOrder } };
  } else if (sortBy === "title") {
    orderBy = { title: sortOrder };
  } else if (sortBy === "status") {
    orderBy = { status: sortOrder };
  } else {
    orderBy = { createdAt: sortOrder };
  }

  return prisma.feedback.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
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
    orderBy,
    ...(limit && { take: limit }),
  });
}

export async function getUserFeedbackForAnalytics(
  userId: string,
  projectId?: string,
) {
  return prisma.feedback.findMany({
    where: {
      project: {
        userId,
      },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      issue: {
        select: {
          state: true,
          commentsCount: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getFeedbackById(userId: string, feedbackId: string) {
  return prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      project: {
        userId,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      issue: {
        include: {
          activities: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });
}

export async function getFeedbackMetadata(userId: string, feedbackId: string) {
  return prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      project: {
        userId,
      },
    },
    select: {
      title: true,
      description: true,
      project: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function getUserFeedbackStats(userId: string) {
  const [total, open, inProgress, closed] = await Promise.all([
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
      },
    }),
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
        status: "open",
      },
    }),
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
        status: "in-progress",
      },
    }),
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
        status: "closed",
      },
    }),
  ]);

  return {
    total,
    open,
    inProgress,
    closed,
  };
}

export async function getUserFeedbackStatsForProject(
  userId: string,
  projectId: string,
) {
  const [total, open, inProgress, closed] = await Promise.all([
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
        projectId,
      },
    }),
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
        projectId,
        status: "open",
      },
    }),
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
        projectId,
        status: "in-progress",
      },
    }),
    prisma.feedback.count({
      where: {
        project: {
          userId,
        },
        projectId,
        status: "closed",
      },
    }),
  ]);

  return {
    total,
    open,
    inProgress,
    closed,
  };
}
