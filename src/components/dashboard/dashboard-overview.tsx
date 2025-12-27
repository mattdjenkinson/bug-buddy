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
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
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
}

export function DashboardOverview({
  latestFeedback,
  stats,
}: DashboardOverviewProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "default",
      closed: "secondary",
      "in-progress": "outline",
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

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
          <Link href="/dashboard/feedback">View All</Link>
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
              onClick={() => router.push(`/dashboard/feedback/${item.id}`)}
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
