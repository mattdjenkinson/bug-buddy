import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { getSession } from "@/lib/auth/helpers";
import { getUserFeedbackForAnalytics } from "@/server/services/analytics.service";
import { getUserProjectBySlug } from "@/server/services/projects.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Analytics | Bug Buddy",
  description:
    "View analytics and insights about your feedback and bug reports",
};

export default async function ProjectAnalyticsPage({
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

  const feedback = await getUserFeedbackForAnalytics(
    session.user.id,
    project.id,
  );

  const transformedFeedback = feedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return <AnalyticsDashboard feedback={transformedFeedback} />;
}
