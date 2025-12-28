import { FeedbackList } from "@/components/dashboard/feedback-list";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import type { FeedbackWhereInput } from "@/server/prisma/generated/prisma/models";
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

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  // Build where clause for filtering
  const where: FeedbackWhereInput = {
    project: {
      userId: session.user.id,
    },
  };

  if (params.projectId && params.projectId !== "all") {
    where.projectId = params.projectId;
  }

  if (params.status && params.status !== "all") {
    where.status = params.status;
  }

  if (params.title) {
    where.OR = [
      { title: { contains: params.title, mode: "insensitive" } },
      { description: { contains: params.title, mode: "insensitive" } },
    ];
  }

  // Build orderBy clause for sorting
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = params.sortOrder || "desc";

  let orderBy:
    | { createdAt?: "asc" | "desc" }
    | { title?: "asc" | "desc" }
    | { status?: "asc" | "desc" }
    | { project: { name: "asc" | "desc" } };
  if (sortBy === "project") {
    orderBy = { project: { name: sortOrder } };
  } else if (sortBy === "title") {
    orderBy = { title: sortOrder };
  } else if (sortBy === "status") {
    orderBy = { status: sortOrder };
  } else {
    orderBy = { createdAt: sortOrder };
  }

  const feedback = await prisma.feedback.findMany({
    where,
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
    orderBy,
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
