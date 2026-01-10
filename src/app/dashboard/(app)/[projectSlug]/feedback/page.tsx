import { FeedbackListScoped } from "@/components/dashboard/feedback-list-scoped";
import { getSession } from "@/lib/auth/helpers";
import { getUserFeedback } from "@/server/services/feedback.service";
import { getUserProjectBySlug } from "@/server/services/projects.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Feedback | Bug Buddy",
  description: "View and manage feedback submissions for your project",
};

interface ProjectFeedbackPageProps {
  params: Promise<{ projectSlug: string }>;
  searchParams: Promise<{
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    title?: string;
  }>;
}

export default async function ProjectFeedbackPage({
  params,
  searchParams,
}: ProjectFeedbackPageProps) {
  const session = await getSession();
  const { projectSlug } = await params;
  const sp = await searchParams;

  if (!session?.user) {
    redirect("/");
  }

  const project = await getUserProjectBySlug(session.user.id, projectSlug);
  if (!project) {
    redirect("/dashboard");
  }

  const feedback = await getUserFeedback({
    userId: session.user.id,
    projectId: project.id,
    status: sp.status,
    title: sp.title,
    sortBy: sp.sortBy,
    sortOrder: sp.sortOrder,
  });

  const transformedFeedback = feedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feedback</h1>
        <p className="text-muted-foreground">
          View and manage feedback submissions
        </p>
      </div>
      <FeedbackListScoped
        projectSlug={projectSlug}
        initialFeedback={transformedFeedback}
      />
    </div>
  );
}
