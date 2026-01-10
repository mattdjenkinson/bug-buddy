"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStatusBadge as getStatusBadgeHelper } from "@/lib/badge-helpers";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderPlus,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Feedback {
  id: string;
  title: string | null;
  description: string;
  screenshot: string;
  status: string;
  userName: string | null;
  userEmail: string | null;
  url: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  issue: {
    id: string;
    githubIssueId: number;
    githubIssueUrl: string;
    state: string;
  } | null;
}

interface DashboardOverviewProps {
  latestFeedback: Feedback[];
  stats: {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
  };
  hasProjects: boolean;
  projectSlug?: string;
}

export function DashboardOverview({
  latestFeedback,
  stats,
  hasProjects,
  projectSlug,
}: DashboardOverviewProps) {
  const router = useRouter();

  // Show empty state if no projects
  if (!hasProjects) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your feedback and analytics
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <FolderPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold">No projects yet</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Get started by creating your first project to start collecting
              feedback from your users.
            </p>
            <Button asChild>
              <Link href="/dashboard/new">
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use shared badge helper
  const getStatusBadge = getStatusBadgeHelper;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your feedback and analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Feedback
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All feedback submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Feedback */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Latest Feedback</h2>
          <p className="text-muted-foreground">
            Most recent feedback submissions
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link
            href={
              projectSlug
                ? `/dashboard/${projectSlug}/feedback`
                : "/dashboard/feedback"
            }
          >
            View All
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {latestFeedback.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No feedback yet. Start collecting feedback from your projects!
            </CardContent>
          </Card>
        ) : (
          latestFeedback.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() =>
                router.push(
                  projectSlug
                    ? `/dashboard/${projectSlug}/feedback/${item.id}`
                    : `/dashboard/feedback/${item.id}`,
                )
              }
            >
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {item.title || "Untitled"}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {item.description}
                    </CardDescription>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-32 h-20 rounded border overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.screenshot}
                      alt="Screenshot"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {item.project.name}
                      </span>
                    </div>
                    {item.userName && (
                      <div className="text-muted-foreground">
                        Reported by: {item.userName}
                        {item.userEmail && ` (${item.userEmail})`}
                      </div>
                    )}
                    {item.issue && (
                      <div className="flex items-center gap-2">
                        <a
                          href={item.issue.githubIssueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          GitHub Issue #{item.issue.githubIssueId}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge variant="outline">{item.issue.state}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
