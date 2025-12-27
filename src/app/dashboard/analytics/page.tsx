import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  // Get all feedback for analytics
  const feedback = await prisma.feedback.findMany({
    where: {
      project: {
        userId: session.user.id,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      issue: {
        select: {
          state: true,
          commentsCount: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform feedback to match expected type (convert Date to string)
  const transformedFeedback = feedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return <AnalyticsDashboard feedback={transformedFeedback} />;
}
