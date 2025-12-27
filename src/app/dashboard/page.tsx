import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  // Get latest 4 feedback items
  const latestFeedback = await prisma.feedback.findMany({
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
          id: true,
          githubIssueId: true,
          githubIssueUrl: true,
          state: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 4,
  });

  // Get stats
  const total = await prisma.feedback.count({
    where: {
      project: {
        userId: session.user.id,
      },
    },
  });

  const open = await prisma.feedback.count({
    where: {
      project: {
        userId: session.user.id,
      },
      status: "open",
    },
  });

  const inProgress = await prisma.feedback.count({
    where: {
      project: {
        userId: session.user.id,
      },
      status: "in-progress",
    },
  });

  const closed = await prisma.feedback.count({
    where: {
      project: {
        userId: session.user.id,
      },
      status: "closed",
    },
  });

  // Transform feedback to match expected type (convert Date to string)
  const transformedFeedback = latestFeedback.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <DashboardOverview
      latestFeedback={transformedFeedback}
      stats={{
        total,
        open,
        inProgress,
        closed,
      }}
    />
  );
}
