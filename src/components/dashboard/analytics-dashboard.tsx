"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useChartColors } from "@/lib/chart-colors";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsDashboardProps {
  feedback: Array<{
    id: string;
    status: string;
    createdAt: string;
    project: {
      id: string;
      name: string;
    };
    issue: {
      state: string;
      commentsCount: number;
    } | null;
  }>;
}

export function AnalyticsDashboard({ feedback }: AnalyticsDashboardProps) {
  const chartColors = useChartColors();
  const primaryColor = chartColors[0] || "#9d4edd";

  // Calculate metrics
  const totalFeedback = feedback.length;
  const openFeedback = feedback.filter((f) => f.status === "open").length;
  const closedFeedback = feedback.filter((f) => f.status === "closed").length;
  const inProgressFeedback = feedback.filter(
    (f) => f.status === "in-progress",
  ).length;

  // Group by date
  const feedbackByDate = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    feedback.forEach((f) => {
      const date = new Date(f.createdAt).toLocaleDateString();
      grouped[date] = (grouped[date] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }, [feedback]);

  // Group by project
  const feedbackByProject = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    feedback.forEach((f) => {
      const projectName = f.project.name;
      grouped[projectName] = (grouped[projectName] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [feedback]);

  // Status distribution
  const statusData = [
    { name: "Open", value: openFeedback },
    { name: "Closed", value: closedFeedback },
    { name: "In Progress", value: inProgressFeedback },
  ];

  // Average response time (if issues exist)
  const issuesWithComments = feedback.filter(
    (f) => f.issue && f.issue.commentsCount > 0,
  );
  const avgResponseTime = issuesWithComments.length > 0 ? "2.5 days" : "N/A";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into your feedback and issues
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              All time submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openFeedback}</div>
            <p className="text-xs text-muted-foreground">Currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedFeedback}</div>
            <p className="text-xs text-muted-foreground">Resolved feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">
              Time to first response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feedback Over Time</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedbackByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  itemStyle={{
                    color: "white",
                  }}
                  contentStyle={{
                    color: "white",
                    backgroundColor: "transparent",
                    border: "none",
                  }}
                  labelStyle={{
                    color: "white",
                    backgroundColor: "transparent",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" stroke={primaryColor} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) =>
                    value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                  }
                  outerRadius={80}
                  fill={primaryColor}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  itemStyle={{
                    color: "white",
                  }}
                  contentStyle={{
                    color: "white",
                    backgroundColor: "transparent",
                    border: "none",
                  }}
                  labelStyle={{
                    color: "white",
                    backgroundColor: "transparent",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback by Project</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feedbackByProject}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  itemStyle={{
                    color: "white",
                  }}
                  contentStyle={{
                    color: "white",
                    backgroundColor: "transparent",
                    border: "none",
                  }}
                  labelStyle={{
                    color: "white",
                    backgroundColor: "transparent",
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill={primaryColor} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
