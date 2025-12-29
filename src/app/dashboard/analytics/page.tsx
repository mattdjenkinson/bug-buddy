import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { getSession } from "@/lib/auth/helpers";
import { getUserFeedbackForAnalytics } from "@/server/services/analytics.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Analytics | Bug Buddy",
  description:
    "View analytics and insights about your feedback and bug reports",
};

export default async function AnalyticsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  // Get all feedback for analytics
  const feedback = await getUserFeedbackForAnalytics(session.user.id);

  // Transform feedback to match expected type (convert Date to string)
  const transformedFeedback = feedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return <AnalyticsDashboard feedback={transformedFeedback} />;
}
