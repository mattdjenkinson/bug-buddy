import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getSession } from "@/lib/auth/helpers";
import {
  getUserFeedback,
  getUserFeedbackStatsForProject,
} from "@/server/services/feedback.service";
import { getUserProjectBySlug } from "@/server/services/projects.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Bug Buddy",
  description: "Overview of your feedback and analytics",
};

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const session = await getSession();
  const { projectSlug } = await params;

  if (!session?.user) {
    redirect("/");
  }

  const project = await getUserProjectBySlug(session.user.id, projectSlug);
  if (!project) {
    redirect("/dashboard");
  }

  const latestFeedback = await getUserFeedback({
    userId: session.user.id,
    projectId: project.id,
    limit: 4,
  });

  const stats = await getUserFeedbackStatsForProject(
    session.user.id,
    project.id,
  );

  const transformedFeedback = latestFeedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <DashboardOverview
      latestFeedback={transformedFeedback}
      stats={stats}
      hasProjects={true}
      projectSlug={projectSlug}
    />
  );
}
