import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getSession } from "@/lib/auth/helpers";
import {
  getUserFeedback,
  getUserFeedbackStats,
} from "@/server/services/feedback.service";
import { getUserProjectCount } from "@/server/services/projects.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Bug Buddy",
  description: "Overview of your bug reports, feedback, and project statistics",
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  // Check if user has any projects
  const projectCount = await getUserProjectCount(session.user.id);
  const hasProjects = projectCount > 0;

  // Get latest 4 feedback items
  const latestFeedback = await getUserFeedback({
    userId: session.user.id,
    limit: 4,
  });

  // Get stats
  const stats = await getUserFeedbackStats(session.user.id);

  // Transform feedback to match expected type (convert Date to string)
  const transformedFeedback = latestFeedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <DashboardOverview
      latestFeedback={transformedFeedback}
      stats={stats}
      hasProjects={hasProjects}
    />
  );
}
