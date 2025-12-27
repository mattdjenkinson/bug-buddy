import { ProjectsList } from "@/components/dashboard/projects-list";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await getSession();

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

  return <ProjectsList projects={projectsWithStringDates} />;
}
