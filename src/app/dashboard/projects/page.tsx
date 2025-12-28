import { ProjectsList } from "@/components/dashboard/projects-list";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Projects | Bug Buddy",
  description: "Manage your projects and API keys",
};

interface ProjectsPageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const session = await getSession();
  const { new: newParam } = await searchParams;

  if (!session?.user) {
    redirect("/");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: {
          feedback: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const projectsWithStringDates = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    apiKey: project.apiKey,
    createdAt: project.createdAt.toISOString(),
    _count: project._count,
  }));

  const shouldOpenDialog = newParam === "true" || projects.length === 0;

  return (
    <ProjectsList
      projects={projectsWithStringDates}
      openDialog={shouldOpenDialog}
    />
  );
}
