import { FeedbackDetail } from "@/components/dashboard/feedback-detail";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await getSession();
  const { id } = await params;

  if (!session?.user) {
    return {
      title: "Feedback | Bug Buddy",
      description: "View feedback details",
    };
  }

  const feedback = await prisma.feedback.findFirst({
    where: {
      id,
      project: {
        userId: session.user.id,
      },
    },
    select: {
      title: true,
      description: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  });

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
