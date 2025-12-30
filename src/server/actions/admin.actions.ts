"use server";

import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";

export async function getAllProjects({
  limit = 10,
  offset = 0,
  search = "",
}: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            feedback: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.project.count({ where }),
  ]);

  // Convert dates to strings
  const projectsWithStringDates = projects.map((project) => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }));

  return {
    projects: projectsWithStringDates,
    total,
  };
}

export async function getUserAccounts(userId: string) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      providerId: true,
      accountId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Convert dates to strings
  return accounts.map((account) => ({
    ...account,
    createdAt: account.createdAt.toISOString(),
  }));
}

export async function getUsersGitHubStatus(userIds: string[]) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  // Get GitHub accounts for all users
  const githubAccounts = await prisma.account.findMany({
    where: {
      userId: { in: userIds },
      providerId: "github",
    },
    select: {
      userId: true,
    },
  });

  const usersWithGitHub = new Set(githubAccounts.map((acc) => acc.userId));

  // Get projects with GitHub integrations that have webhooks
  const projectsWithWebhooks = await prisma.project.findMany({
    where: {
      userId: { in: userIds },
      githubIntegration: {
        webhookId: { not: null },
      },
    },
    select: {
      userId: true,
    },
  });

  const usersWithWebhooks = new Set(
    projectsWithWebhooks.map((project) => project.userId),
  );

  // Return a map of userId -> { hasGitHub: boolean, hasWebhook: boolean }
  const statusMap: Record<string, { hasGitHub: boolean; hasWebhook: boolean }> =
    {};

  userIds.forEach((userId) => {
    statusMap[userId] = {
      hasGitHub: usersWithGitHub.has(userId),
      hasWebhook: usersWithWebhooks.has(userId),
    };
  });

  return statusMap;
}
