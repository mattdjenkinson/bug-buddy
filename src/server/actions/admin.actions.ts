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

  // A user is considered to have "GitHub App installed" if any of their projects
  // has a GitHub App installationId saved on its GitHub integration.
  const integrationsWithInstall = await prisma.gitHubIntegration.findMany({
    where: {
      installationId: { not: null },
      project: { userId: { in: userIds } },
    },
    select: {
      project: { select: { userId: true } },
    },
  });

  const usersWithGitHubAppInstalled = new Set(
    integrationsWithInstall.map((i) => i.project.userId),
  );

  // Return a map of userId -> { hasGitHubAppInstalled: boolean }
  const statusMap: Record<string, { hasGitHubAppInstalled: boolean }> = {};

  userIds.forEach((userId) => {
    statusMap[userId] = {
      hasGitHubAppInstalled: usersWithGitHubAppInstalled.has(userId),
    };
  });

  return statusMap;
}
