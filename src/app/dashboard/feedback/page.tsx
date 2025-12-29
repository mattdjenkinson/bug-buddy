import { FeedbackList } from "@/components/dashboard/feedback-list";
import { getSession } from "@/lib/auth/helpers";
import { getUserFeedback } from "@/server/services/feedback.service";
import { getUserProjectsBasic } from "@/server/services/projects.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Feedback | Bug Buddy",
  description: "View and manage all feedback submissions from your projects",
};

interface FeedbackPageProps {
  searchParams: Promise<{
    projectId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    title?: string;
  }>;
}

export default async function FeedbackPage({
  searchParams,
}: FeedbackPageProps) {
  const session = await getSession();
  const params = await searchParams;

  if (!session?.user) {
    redirect("/");
  }

  const projects = await getUserProjectsBasic(session.user.id);

  const feedback = await getUserFeedback({
    userId: session.user.id,
    projectId: params.projectId,
    status: params.status,
    title: params.title,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  // Transform feedback to match expected type (convert Date to string)
  const transformedFeedback = feedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feedback</h1>
        <p className="text-muted-foreground">
          View and manage all feedback submissions
        </p>
      </div>
      <FeedbackList projects={projects} initialFeedback={transformedFeedback} />
    </div>
  );
}
