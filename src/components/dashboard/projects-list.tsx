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
import { clientEnv } from "@/env";
import { Check, Code, Copy } from "lucide-react";
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
  }>;
}

export function ProjectsList({ projects: initialProjects }: ProjectsListProps) {
  const [projects, setProjects] = React.useState(initialProjects);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleProjectCreated = (project: ProjectsListProps["projects"][0]) => {
    setProjects([project, ...projects]);
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(apiKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyEmbedCode = (apiKey: string) => {
    const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;
    const embedCode = `<script src="${appUrl}/widget.js" data-project-key="${apiKey}" data-app-url="${appUrl}"></script>`;
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied to clipboard!");
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
        <CreateProjectDialog onProjectCreated={handleProjectCreated} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>
                {project.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Feedback:</span>{" "}
                {project._count.feedback}
              </div>
              <div className="space-y-2">
                <FieldLabel className="text-xs">API Key</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    value={project.apiKey}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyApiKey(project.apiKey)}
                  >
                    {copiedKey === project.apiKey ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyEmbedCode(project.apiKey)}
              >
                <Code className="h-4 w-4" />
                Copy Embed Code
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
