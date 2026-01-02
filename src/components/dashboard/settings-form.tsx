"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useQueryState } from "nuqs";
import * as React from "react";
import { GitHubIntegrationForm } from "./github-integration-form";
import { ProjectSettingsForm } from "./project-settings-form";
import { WidgetCustomizationForm } from "./widget-customization-form";

interface SettingsFormProps {
  projects: Array<{
    id: string;
    name: string;
    apiKey: string;
    secretKey: string | null;
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
  // Use nuqs for URL state management
  const [urlProject, setUrlProject] = useQueryState("project", {
    defaultValue: projects[0]?.id || "",
  });
  const [urlTab, setUrlTab] = useQueryState("tab", {
    defaultValue: "project",
  });

  const [pendingTab, setPendingTab] = React.useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const [githubFormDirty, setGithubFormDirty] = React.useState(false);
  const [widgetFormDirty, setWidgetFormDirty] = React.useState(false);

  // Validate project exists in projects array
  React.useEffect(() => {
    if (urlProject && !projects.some((p) => p.id === urlProject)) {
      // Invalid project, reset to first project
      const firstProjectId = projects[0]?.id || "";
      if (firstProjectId) {
        setUrlProject(firstProjectId);
      }
    }
  }, [urlProject, projects, setUrlProject]);

  // Validate tab is one of the valid tabs
  React.useEffect(() => {
    const validTabs = ["project", "github", "widget"];
    if (urlTab && !validTabs.includes(urlTab)) {
      // Invalid tab, reset to default
      setUrlTab(null); // null will use the default value "project"
    }
  }, [urlTab, setUrlTab]);

  // Use validated values
  const selectedProject =
    urlProject && projects.some((p) => p.id === urlProject)
      ? urlProject
      : projects[0]?.id || "";

  const activeTab = (() => {
    const validTabs = ["project", "github", "widget"];
    return urlTab && validTabs.includes(urlTab) ? urlTab : "project";
  })();

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  // Track previous active tab to detect external URL changes
  const prevActiveTabRef = React.useRef(activeTab);
  const isInternalChangeRef = React.useRef(false);

  // Handle tab changes from URL (e.g., browser back/forward, direct links)
  // Only allow tab change if no unsaved changes
  React.useEffect(() => {
    const validTabs = ["project", "github", "widget"];
    const currentTab =
      urlTab && validTabs.includes(urlTab) ? urlTab : "project";

    // Skip if this is an internal change we initiated
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      prevActiveTabRef.current = currentTab;
      return;
    }

    // Only check if tab actually changed externally
    if (currentTab !== prevActiveTabRef.current) {
      const hasUnsavedChanges =
        (prevActiveTabRef.current === "github" && githubFormDirty) ||
        (prevActiveTabRef.current === "widget" && widgetFormDirty);

      if (hasUnsavedChanges) {
        // Revert the URL change if there are unsaved changes
        const previousTab = prevActiveTabRef.current;
        isInternalChangeRef.current = true;
        setUrlTab(previousTab === "project" ? null : previousTab);
        setPendingTab(currentTab);
        setShowUnsavedDialog(true);
      } else {
        // Update the ref to the new tab
        prevActiveTabRef.current = currentTab;
      }
    }
  }, [urlTab, githubFormDirty, widgetFormDirty, setUrlTab]);

  // Update ref when activeTab changes (from user interaction)
  React.useEffect(() => {
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  // Reset dirty state when project changes
  React.useEffect(() => {
    setGithubFormDirty(false);
    setWidgetFormDirty(false);
  }, [selectedProject]);

  // Handle project selection change
  const handleProjectChange = (projectId: string) => {
    setUrlProject(projectId);
  };

  const handleTabChange = (value: string) => {
    // Check if current tab has unsaved changes
    const currentTabHasChanges =
      (activeTab === "github" && githubFormDirty) ||
      (activeTab === "widget" && widgetFormDirty);

    if (currentTabHasChanges) {
      setPendingTab(value);
      setShowUnsavedDialog(true);
    } else {
      // Mark as internal change to avoid triggering the external change effect
      isInternalChangeRef.current = true;
      // Only set tab if it's not "project" (nuqs will remove it from URL if null)
      setUrlTab(value === "project" ? null : value);
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingTab) {
      // Mark as internal change to avoid triggering the external change effect
      isInternalChangeRef.current = true;
      // Only set tab if it's not "project" (nuqs will remove it from URL if null)
      setUrlTab(pendingTab === "project" ? null : pendingTab);
      setPendingTab(null);
    }
    // Reset dirty state for the tab we're leaving
    if (activeTab === "github") {
      setGithubFormDirty(false);
    } else if (activeTab === "widget") {
      setWidgetFormDirty(false);
    }
    setShowUnsavedDialog(false);
  };

  const handleCancelNavigation = () => {
    setPendingTab(null);
    setShowUnsavedDialog(false);
  };

  // Warn on browser navigation if there are unsaved changes
  React.useEffect(() => {
    const hasUnsavedChanges = githubFormDirty || widgetFormDirty;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [githubFormDirty, widgetFormDirty]);

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

      <Select value={selectedProject} onValueChange={handleProjectChange}>
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

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
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
              secretKey={selectedProjectData.secretKey}
              allowedDomains={selectedProjectData.allowedDomains}
            />
          )}
        </TabsContent>

        <TabsContent value="github">
          <GitHubIntegrationForm
            projectId={selectedProject}
            initialData={selectedProjectData?.githubIntegration || null}
            onDirtyChange={setGithubFormDirty}
          />
        </TabsContent>

        <TabsContent value="widget">
          <WidgetCustomizationForm
            projectId={selectedProject}
            initialData={selectedProjectData?.widgetCustomization || null}
            onDirtyChange={setWidgetFormDirty}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your
              changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNavigation}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmNavigation}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
