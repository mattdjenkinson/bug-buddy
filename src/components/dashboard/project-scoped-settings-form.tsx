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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderPlus } from "lucide-react";
import { useQueryState } from "nuqs";
import * as React from "react";
import { CreateProjectDialog } from "./create-project-dialog";
import { GitHubAppIntegrationForm } from "./github-app-integration-form";
import { ProjectSettingsForm } from "./project-settings-form";
import { WidgetCustomizationForm } from "./widget-customization-form";

interface ProjectScopedSettingsFormProps {
  project: {
    id: string;
    name: string;
    apiKey: string;
    secretKey: string | null;
    allowedDomains: string[];
    githubIntegration: {
      id: string;
      repositoryOwner: string;
      repositoryName: string;
      defaultLabels: string[];
      defaultAssignees: string[];
      installationId: string | null;
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
  };
}

export function ProjectScopedSettingsForm({
  project,
}: ProjectScopedSettingsFormProps) {
  const [urlTab, setUrlTab] = useQueryState("tab", {
    defaultValue: "project",
  });

  const [pendingTab, setPendingTab] = React.useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const [githubFormDirty, setGithubFormDirty] = React.useState(false);
  const [widgetFormDirty, setWidgetFormDirty] = React.useState(false);

  const activeTab = (() => {
    const validTabs = ["project", "github", "widget"];
    return urlTab && validTabs.includes(urlTab) ? urlTab : "project";
  })();

  const prevActiveTabRef = React.useRef(activeTab);
  const isInternalChangeRef = React.useRef(false);

  React.useEffect(() => {
    const validTabs = ["project", "github", "widget"];
    const currentTab =
      urlTab && validTabs.includes(urlTab) ? urlTab : "project";

    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      prevActiveTabRef.current = currentTab;
      return;
    }

    if (currentTab !== prevActiveTabRef.current) {
      const hasUnsavedChanges =
        (prevActiveTabRef.current === "github" && githubFormDirty) ||
        (prevActiveTabRef.current === "widget" && widgetFormDirty);

      if (hasUnsavedChanges) {
        const previousTab = prevActiveTabRef.current;
        isInternalChangeRef.current = true;
        setUrlTab(previousTab === "project" ? null : previousTab);
        setPendingTab(currentTab);
        setShowUnsavedDialog(true);
      } else {
        prevActiveTabRef.current = currentTab;
      }
    }
  }, [urlTab, githubFormDirty, widgetFormDirty, setUrlTab]);

  React.useEffect(() => {
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    const currentTabHasChanges =
      (activeTab === "github" && githubFormDirty) ||
      (activeTab === "widget" && widgetFormDirty);

    if (currentTabHasChanges) {
      setPendingTab(value);
      setShowUnsavedDialog(true);
    } else {
      isInternalChangeRef.current = true;
      setUrlTab(value === "project" ? null : value);
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingTab) {
      isInternalChangeRef.current = true;
      setUrlTab(pendingTab === "project" ? null : pendingTab);
      setPendingTab(null);
    }
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

  if (!project) {
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
            <h2 className="mb-2 text-2xl font-semibold">No project found</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Select or create a project to configure settings, GitHub
              integration, and widget customization.
            </p>
            <CreateProjectDialog
              title="Create a project"
              trigger={
                <Button>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create a Project
                </Button>
              }
            />
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
          <ProjectSettingsForm
            projectId={project.id}
            projectName={project.name}
            apiKey={project.apiKey}
            secretKey={project.secretKey}
            allowedDomains={project.allowedDomains}
          />
        </TabsContent>

        <TabsContent value="github">
          <GitHubAppIntegrationForm
            projectId={project.id}
            initialData={project.githubIntegration || null}
            onDirtyChange={setGithubFormDirty}
          />
        </TabsContent>

        <TabsContent value="widget">
          <WidgetCustomizationForm
            projectId={project.id}
            apiKey={project.apiKey}
            initialData={project.widgetCustomization || null}
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
