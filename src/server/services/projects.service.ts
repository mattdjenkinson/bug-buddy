import { prisma } from "@/lib/prisma";

export async function getUserProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      description: true,
      apiKey: true,
      secretKey: true,
      createdAt: true,
      _count: {
        select: {
          feedback: true,
        },
      },
      githubIntegration: {
        select: {
          repositoryOwner: true,
          repositoryName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getUserProjectsWithIntegrations(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: {
      githubIntegration: true,
      widgetCustomization: true,
    },
  });
}

export async function getUserProjectsBasic(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
}

export async function getUserProjectCount(userId: string) {
  return prisma.project.count({
    where: { userId },
  });
}

export async function getProjectByApiKey(apiKey: string) {
  return prisma.project.findUnique({
    where: { apiKey },
    include: {
      widgetCustomization: true,
      githubIntegration: true,
    },
  });
}
