import { prisma } from "@/lib/prisma";

export async function getUserProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      slug: true,
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

export async function getUserProjectsForSwitcher(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserProjectBySlug(userId: string, slug: string) {
  return prisma.project.findFirst({
    where: { userId, slug },
    include: {
      githubIntegration: true,
      widgetCustomization: true,
      _count: { select: { feedback: true } },
    },
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

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
    include: {
      widgetCustomization: true,
      githubIntegration: true,
    },
  });
}
