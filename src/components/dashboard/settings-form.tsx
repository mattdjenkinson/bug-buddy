"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      backgroundColor: string;
      fontFamily: string;
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
