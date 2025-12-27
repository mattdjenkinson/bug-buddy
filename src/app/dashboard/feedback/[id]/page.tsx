import { FeedbackDetail } from "@/components/dashboard/feedback-detail";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  if (!session?.user) {
    notFound();
  }

  const feedback = await prisma.feedback.findFirst({
    where: {
      id,
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
        include: {
          activities: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!feedback) {
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
  };

  return <FeedbackDetail feedback={feedbackWithStringDates} />;
}
