import { ProjectsList } from "@/components/dashboard/projects-list";
import { getSession } from "@/lib/auth/helpers";
import { getUserProjects } from "@/server/services/projects.service";
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

  const projects = await getUserProjects(session.user.id);

  const projectsWithStringDates = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    apiKey: project.apiKey,
    secretKey: project.secretKey,
    createdAt: project.createdAt.toISOString(),
    _count: project._count,
    githubIntegration: project.githubIntegration
      ? {
          repositoryOwner: project.githubIntegration.repositoryOwner,
          repositoryName: project.githubIntegration.repositoryName,
        }
      : null,
  }));

  const shouldOpenDialog = newParam === "true" || projects.length === 0;

  return (
    <ProjectsList
      projects={projectsWithStringDates}
      openDialog={shouldOpenDialog}
    />
  );
}
