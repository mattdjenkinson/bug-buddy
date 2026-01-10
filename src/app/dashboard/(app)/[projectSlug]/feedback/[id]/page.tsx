import { FeedbackDetail } from "@/components/dashboard/feedback-detail";
import { getSession } from "@/lib/auth/helpers";
import {
  getFeedbackById,
  getFeedbackMetadata,
} from "@/server/services/feedback.service";
import { getUserProjectBySlug } from "@/server/services/projects.service";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectSlug: string; id: string }>;
}): Promise<Metadata> {
  const session = await getSession();
  const { id } = await params;

  if (!session?.user) {
    return {
      title: "Feedback | Bug Buddy",
      description: "View feedback details",
    };
  }

  const feedback = await getFeedbackMetadata(session.user.id, id);

  if (!feedback) {
    return {
      title: "Feedback | Bug Buddy",
      description: "View feedback details",
    };
  }

  return {
    title: `${feedback.title} | Bug Buddy`,
    description:
      feedback.description || `Feedback from ${feedback.project.name}`,
  };
}

export default async function ProjectFeedbackDetailPage({
  params,
}: {
  params: Promise<{ projectSlug: string; id: string }>;
}) {
  const session = await getSession();
  const { projectSlug, id } = await params;

  if (!session?.user) {
    notFound();
  }

  const project = await getUserProjectBySlug(session.user.id, projectSlug);
  if (!project) {
    redirect("/dashboard");
  }

  const feedback = await getFeedbackById(session.user.id, id);

  if (!feedback || feedback.projectId !== project.id) {
    notFound();
  }

  const feedbackWithStringDates = {
    ...feedback,
    createdAt: feedback.createdAt.toISOString(),
    issue: feedback.issue
      ? {
          ...feedback.issue,
          activities: feedback.issue.activities.map((activity) => ({
            ...activity,
            createdAt: activity.createdAt.toISOString(),
          })),
        }
      : null,
    deviceInfo:
      typeof feedback.deviceInfo === "string"
        ? JSON.parse(feedback.deviceInfo)
        : feedback.deviceInfo,
  };

  return <FeedbackDetail feedback={feedbackWithStringDates} />;
}
