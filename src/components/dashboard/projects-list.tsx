"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useGitHubConnectionStatus } from "@/hooks/use-github-connection-status";
import { getBaseUrlClient } from "@/lib/base-url.client";
import { Check, Code, Copy, Github, Settings2 } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import * as React from "react";
import { toast } from "sonner";
import { CreateProjectDialog } from "./create-project-dialog";

interface ProjectsListProps {
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    apiKey: string;
    createdAt: string;
    _count: {
      feedback: number;
    };
    githubIntegration: {
      repositoryOwner: string;
      repositoryName: string;
    } | null;
  }>;
  openDialog?: boolean;
}

export function ProjectsList({
  projects: initialProjects,
  openDialog = false,
}: ProjectsListProps) {
  const [projects, setProjects] = React.useState(initialProjects);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(openDialog);

  // Handle GitHub connection success/error from query params
  useGitHubConnectionStatus();

  const handleProjectCreated = (project: ProjectsListProps["projects"][0]) => {
    setProjects([project, ...projects]);
  };

  const copyApiKey = (apiKey: string, projectId: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(apiKey);
    setTimeout(() => setCopiedKey(null), 2000);

    // Track API key copy
    posthog.capture("api_key_copied", {
      project_id: projectId,
    });
  };

  const copyEmbedCode = (apiKey: string, projectId: string) => {
    const appUrl = getBaseUrlClient();
    const embedCode = `<script src="${appUrl}/widget.js" data-project-key="${apiKey}" data-app-url="${appUrl}"></script>`;
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied to clipboard!");

    // Track embed code copy - key activation step
    posthog.capture("embed_code_copied", {
      project_id: projectId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-start md:justify-between flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your feedback widget projects
          </p>
        </div>
        <CreateProjectDialog
          onProjectCreated={handleProjectCreated}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Feedback:</span>{" "}
                {project._count.feedback}
              </div>
              {project.githubIntegration && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Github className="h-4 w-4" />
                  <span>
                    {project.githubIntegration.repositoryOwner}/
                    {project.githubIntegration.repositoryName}
                  </span>
                </div>
              )}
              <div className="mt-auto gap-4 flex flex-col">
                <div className="space-y-2">
                  <FieldLabel className="text-xs">API Key</FieldLabel>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={project.apiKey}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyApiKey(project.apiKey, project.id)}
                    >
                      {copiedKey === project.apiKey ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => copyEmbedCode(project.apiKey, project.id)}
                  >
                    <Code className="h-4 w-4" />
                    Copy Embed Code
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      href={`/dashboard/settings?project=${project.id}`}
                      aria-label="Project settings"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
