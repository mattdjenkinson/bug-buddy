"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderPlus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { GitHubIntegrationForm } from "./github-integration-form";
import { ProjectSettingsForm } from "./project-settings-form";
import { WidgetCustomizationForm } from "./widget-customization-form";

interface SettingsFormProps {
  projects: Array<{
    id: string;
    name: string;
    apiKey: string;
    allowedDomains: string[];
    githubIntegration: {
      id: string;
      personalAccessToken: string | null;
      repositoryOwner: string;
      repositoryName: string;
      defaultLabels: string[];
      defaultAssignees: string[];
      webhookSecret: string | null;
    } | null;
    widgetCustomization: {
      id: string;
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
      fontUrl: string | null;
      fontFileName: string | null;
      borderRadius: string;
      buttonText: string;
      buttonPosition: string;
    } | null;
  }>;
}

export function SettingsForm({ projects }: SettingsFormProps) {
  const [selectedProject, setSelectedProject] = React.useState<string>(
    projects[0]?.id || "",
  );

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  // Show empty state if no projects
  if (projects.length === 0) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <FolderPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold">No projects yet</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Create a project to configure settings, GitHub integration, and
              widget customization.
            </p>
            <Button asChild>
              <Link href="/dashboard/projects?new=true">
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Select value={selectedProject} onValueChange={setSelectedProject}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tabs defaultValue="project" className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex min-w-fit ">
            <TabsTrigger value="project">Project Settings</TabsTrigger>
            <TabsTrigger value="github">GitHub Integration</TabsTrigger>
            <TabsTrigger value="widget">Widget Customization</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="project">
          {selectedProjectData && (
            <ProjectSettingsForm
              projectId={selectedProject}
              projectName={selectedProjectData.name}
              apiKey={selectedProjectData.apiKey}
              allowedDomains={selectedProjectData.allowedDomains}
            />
          )}
        </TabsContent>

        <TabsContent value="github">
          <GitHubIntegrationForm
            projectId={selectedProject}
            initialData={selectedProjectData?.githubIntegration || null}
          />
        </TabsContent>

        <TabsContent value="widget">
          <WidgetCustomizationForm
            projectId={selectedProject}
            initialData={selectedProjectData?.widgetCustomization || null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
