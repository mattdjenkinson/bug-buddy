"use client";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { closeIssue } from "@/server/actions/github/close-issue";
import {
  Calendar,
  ExternalLink,
  Globe,
  Mail,
  MessageSquare,
  Monitor,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import * as React from "react";
import { toast } from "sonner";

interface FeedbackDetailProps {
  feedback: {
    id: string;
    title: string | null;
    description: string;
    screenshot: string;
    annotations: string | null;
    status: string;
    userName: string | null;
    userEmail: string | null;
    url: string | null;
    userAgent: string | null;
    deviceInfo: {
      deviceType?: string;
      browser?: string;
      screenSize?: { width: number; height: number };
      viewportSize?: { width: number; height: number };
      os?: string;
      zoomLevel?: number;
      pixelRatio?: number;
    } | null;
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
      title: string;
      assignees: string[];
      labels: string[];
      commentsCount: number;
      prsCount: number;
      activities: Array<{
        id: string;
        type: string;
        actor: string | null;
        content: string | null;
        createdAt: string;
      }>;
    } | null;
  };
}

// Parse user agent to extract browser and OS information
function parseUserAgent(userAgent: string) {
  const browserInfo = {
    name: "Unknown",
    version: "",
  };
  const osInfo = {
    name: "Unknown",
    version: "",
  };

  // Parse browser
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    const match = userAgent.match(/Chrome\/([\d.]+)/);
    browserInfo.name = "Chrome";
    browserInfo.version = match ? match[1] : "";
  } else if (userAgent.includes("Firefox")) {
    const match = userAgent.match(/Firefox\/([\d.]+)/);
    browserInfo.name = "Firefox";
    browserInfo.version = match ? match[1] : "";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    const match = userAgent.match(/Version\/([\d.]+).*Safari/);
    browserInfo.name = "Safari";
    browserInfo.version = match ? match[1] : "";
  } else if (userAgent.includes("Edg")) {
    const match = userAgent.match(/Edg\/([\d.]+)/);
    browserInfo.name = "Edge";
    browserInfo.version = match ? match[1] : "";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    const match = userAgent.match(/(?:Opera|OPR)\/([\d.]+)/);
    browserInfo.name = "Opera";
    browserInfo.version = match ? match[1] : "";
  }

  // Parse OS
  if (userAgent.includes("Windows NT")) {
    const match = userAgent.match(/Windows NT ([\d.]+)/);
    const version = match ? match[1] : "";
    osInfo.name = "Windows";
    osInfo.version =
      version === "10.0"
        ? "10/11"
        : version === "6.3"
          ? "8.1"
          : version === "6.2"
            ? "8"
            : version === "6.1"
              ? "7"
              : version;
  } else if (
    userAgent.includes("Mac OS X") ||
    userAgent.includes("Macintosh") ||
    userAgent.includes("macOS")
  ) {
    const match = userAgent.match(/Mac OS X ([\d_]+)/);
    osInfo.name = "macOS";
    osInfo.version = match ? match[1].replace(/_/g, ".") : "";
  } else if (userAgent.includes("Linux")) {
    osInfo.name = "Linux";
  } else if (userAgent.includes("Android")) {
    const match = userAgent.match(/Android ([\d.]+)/);
    osInfo.name = "Android";
    osInfo.version = match ? match[1] : "";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    const match = userAgent.match(/OS ([\d_]+)/);
    osInfo.name = userAgent.includes("iPad") ? "iPadOS" : "iOS";
    osInfo.version = match ? match[1].replace(/_/g, ".") : "";
  }

  return { browser: browserInfo, os: osInfo };
}

export function FeedbackDetail({ feedback }: FeedbackDetailProps) {
  const router = useRouter();
  const [closing, setClosing] = React.useState(false);

  const userAgentInfo = feedback.userAgent
    ? parseUserAgent(feedback.userAgent)
    : null;

  const handleCloseIssue = async () => {
    if (!feedback.issue) return;

    setClosing(true);
    try {
      const result = await closeIssue({ issueId: feedback.issue.id });

      if (result.success) {
        toast.success("Issue closed successfully");

        // Track GitHub issue closure
        posthog.capture("github_issue_closed", {
          feedback_id: feedback.id,
          project_id: feedback.project.id,
          github_issue_id: feedback.issue.githubIssueId,
        });

        router.refresh();
      } else {
        toast.error(result.error || "Failed to close issue");
      }
    } catch (error) {
      console.error("Error closing issue:", error);
      toast.error("Failed to close issue");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {feedback.title || "Untitled"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {feedback.project.name} •{" "}
            {new Date(feedback.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Badge
            variant={feedback.status === "open" ? "default" : "secondary"}
            className="w-fit"
          >
            {feedback.status}
          </Badge>
          {feedback.issue && (
            <a
              href={feedback.issue.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
            >
              GitHub Issue #{feedback.issue.githubIssueId}
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-video rounded-lg border overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={feedback.screenshot}
                alt="Screenshot"
                className="object-contain"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word">
                {feedback.description}
              </p>
            </div>

            <div className="space-y-2">
              {feedback.userName && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Name:</span>
                  </div>
                  <span className="sm:ml-0 wrap-break-word">
                    {feedback.userName}
                  </span>
                </div>
              )}
              {feedback.userEmail && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Email:</span>
                  </div>
                  <span className="sm:ml-0 break-all">
                    {feedback.userEmail}
                  </span>
                </div>
              )}
              {feedback.url && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">URL:</span>
                  </div>
                  <a
                    href={feedback.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all sm:truncate"
                  >
                    {feedback.url}
                  </a>
                </div>
              )}
              {feedback.userAgent && userAgentInfo && (
                <div className="space-y-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Browser:</span>
                    </div>
                    <span className="sm:ml-0">
                      {userAgentInfo.browser.name}
                      {userAgentInfo.browser.version &&
                        ` ${userAgentInfo.browser.version}`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">OS:</span>
                    </div>
                    <span className="sm:ml-0">
                      {userAgentInfo.os.name}
                      {userAgentInfo.os.version &&
                        ` ${userAgentInfo.os.version}`}
                    </span>
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View full user agent
                    </summary>
                    <p className="text-xs text-muted-foreground mt-2 break-all font-mono">
                      {feedback.userAgent}
                    </p>
                  </details>
                </div>
              )}
              {feedback.deviceInfo && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="font-semibold text-sm mb-2">
                    Device Information
                  </h4>
                  {feedback.deviceInfo.deviceType && (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          Device type:
                        </span>
                      </div>
                      <span className="sm:ml-0 capitalize">
                        {feedback.deviceInfo.deviceType}
                      </span>
                    </div>
                  )}
                  {feedback.deviceInfo.browser && (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Browser:</span>
                      </div>
                      <span className="sm:ml-0">
                        {feedback.deviceInfo.browser}
                      </span>
                    </div>
                  )}
                  {feedback.deviceInfo.screenSize && (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          Screen Size:
                        </span>
                      </div>
                      <span className="sm:ml-0">
                        {feedback.deviceInfo.screenSize.width} x{" "}
                        {feedback.deviceInfo.screenSize.height}
                      </span>
                    </div>
                  )}
                  {feedback.deviceInfo.os && (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">OS:</span>
                      </div>
                      <span className="sm:ml-0">{feedback.deviceInfo.os}</span>
                    </div>
                  )}
                  {feedback.deviceInfo.viewportSize && (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          Viewport Size:
                        </span>
                      </div>
                      <span className="sm:ml-0">
                        {feedback.deviceInfo.viewportSize.width} x{" "}
                        {feedback.deviceInfo.viewportSize.height}
                      </span>
                    </div>
                  )}
                  {feedback.deviceInfo.zoomLevel !== undefined && (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          Zoom Level:
                        </span>
                      </div>
                      <span className="sm:ml-0">
                        {feedback.deviceInfo.zoomLevel}%
                      </span>
                    </div>
                  )}
                  {feedback.deviceInfo.pixelRatio !== undefined && (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          Pixel Ratio:
                        </span>
                      </div>
                      <span className="sm:ml-0">
                        @{feedback.deviceInfo.pixelRatio}x
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Submitted:</span>
                </div>
                <span className="sm:ml-0">
                  {new Date(feedback.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {feedback.issue && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>GitHub Issue</CardTitle>
              {feedback.issue.state === "open" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseIssue}
                  disabled={closing}
                  className="w-full sm:w-auto"
                  loading={closing}
                >
                  Close Issue
                </Button>
              )}
            </div>
            <CardDescription>
              <a
                href={feedback.issue.githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {feedback.issue.githubIssueUrl}
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 sm:flex-wrap">
              <div className="text-sm">
                <span className="text-muted-foreground">State:</span>{" "}
                <Badge variant="outline">{feedback.issue.state}</Badge>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Comments:</span>{" "}
                {feedback.issue.commentsCount}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">PRs:</span>{" "}
                {feedback.issue.prsCount}
              </div>
            </div>

            {feedback.issue.assignees.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Assignees:
                </span>{" "}
                <div className="flex gap-2 mt-1">
                  {feedback.issue.assignees.map((assignee) => (
                    <Badge key={assignee} variant="secondary">
                      {assignee}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {feedback.issue.labels.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Labels:</span>{" "}
                <div className="flex gap-2 mt-1">
                  {feedback.issue.labels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {feedback.issue.activities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Activity Timeline</h3>
                <div className="space-y-2">
                  {feedback.issue.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded border text-sm"
                    >
                      <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          {activity.actor && (
                            <span className="font-medium">
                              {activity.actor}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {activity.type === "comment" && "commented"}
                            {activity.type === "state_change" &&
                              activity.content}
                            {activity.type === "assignee" && "assigned"}
                            {activity.type === "label" && "added label"}
                          </span>
                        </div>
                        {activity.content && activity.type === "comment" && (
                          <div className="mt-1">
                            <MarkdownRenderer content={activity.content} />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
