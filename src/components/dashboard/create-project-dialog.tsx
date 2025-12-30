"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProjectSchema } from "@/lib/schemas";
import { checkGitHubConnection } from "@/server/actions/github/check-connection";
import { initiateGitHubConnection } from "@/server/actions/github/connect-github";
import { getUserRepositories } from "@/server/actions/github/repositories";
import { createProject } from "@/server/actions/projects/create";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type ProjectForm = z.infer<typeof createProjectSchema>;

interface CreateProjectDialogProps {
  onProjectCreated?: (project: {
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
  }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateProjectDialog({
  onProjectCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateProjectDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [githubConnected, setGithubConnected] = React.useState(false);
  const [loadingRepos, setLoadingRepos] = React.useState(false);
  const [repositories, setRepositories] = React.useState<
    Array<{
      id: number;
      name: string;
      fullName: string;
      owner: string;
      private: boolean;
    }>
  >([]);
  const [repoError, setRepoError] = React.useState<string | null>(null);
  const router = useRouter();

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const form = useForm<ProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      repository: "",
    },
  });

  const fetchRepositories = React.useCallback(async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const result = await getUserRepositories();
      if (result.success) {
        setRepositories(result.repositories);
      } else {
        setRepoError(result.error || "Failed to fetch repositories");
      }
    } catch {
      setRepoError("Failed to fetch repositories");
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const checkGitHubStatus = React.useCallback(async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const connectionResult = await checkGitHubConnection();
      if (connectionResult.success && connectionResult.connected) {
        setGithubConnected(true);
        // Fetch repositories
        await fetchRepositories();
      } else {
        setGithubConnected(false);
        setRepositories([]);
        setLoadingRepos(false);
      }
    } catch (error) {
      console.error("Error checking GitHub connection:", error);
      setGithubConnected(false);
      setLoadingRepos(false);
    }
  }, [fetchRepositories]);

  // Check GitHub connection when dialog opens
  React.useEffect(() => {
    if (open) {
      checkGitHubStatus();
    }
  }, [open, checkGitHubStatus]);

  const handleConnectGitHub = async () => {
    await initiateGitHubConnection("/dashboard/projects");
  };

  const onSubmit = async (data: ProjectForm) => {
    // Prevent submission if GitHub is not connected
    if (!githubConnected) {
      toast.error("Please connect your GitHub account to create a project");
      return;
    }

    setCreating(true);
    try {
      const result = await createProject(data);

      if (!result.success || !result.project) {
        throw new Error(result.error || "Failed to create project");
      }

      setOpen(false);
      form.reset();

      // Show success message
      if (result.webhookWarning) {
        toast.warning(
          "Project created, but webhook setup failed. Please go to Settings to configure the webhook manually.",
          {
            duration: 10000,
            description: "Click here to go to Settings",
            action: {
              label: "Go to Settings",
              onClick: () => {
                router.push(
                  `/dashboard/settings?project=${result.project.id}&tab=github`,
                );
              },
            },
          },
        );
      } else {
        toast.success("Project created successfully!");
      }

      // Track project creation
      posthog.capture("project_created", {
        project_id: result.project.id,
        project_name: result.project.name,
        has_description: !!result.project.description,
        has_repository: !!data.repository,
        webhook_created: !result.webhookWarning,
      });

      onProjectCreated?.(result.project);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to get an API key for embedding the feedback
            widget.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {!githubConnected && !loadingRepos && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  GitHub Account Required
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You need to connect your GitHub account to create a project.
                  This will only grant repository access and won&apos;t change
                  your login method.
                </p>
                <Button
                  type="button"
                  onClick={handleConnectGitHub}
                  className="mt-2"
                  size="sm"
                >
                  Connect GitHub Account
                </Button>
              </div>
            </div>
          )}
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Project Name</FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    placeholder="My Website"
                    aria-invalid={fieldState.invalid}
                  />

                  <FieldError
                    errors={
                      fieldState.error
                        ? [{ message: fieldState.error.message }]
                        : undefined
                    }
                  />
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="description">
                    Description (optional)
                  </FieldLabel>
                  <Input
                    {...field}
                    id="description"
                    placeholder="Description of the project"
                    aria-invalid={fieldState.invalid}
                  />

                  <FieldError
                    errors={
                      fieldState.error
                        ? [{ message: fieldState.error.message }]
                        : undefined
                    }
                  />
                </Field>
              )}
            />
            <Controller
              name="repository"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="repository">
                    GitHub Repository{" "}
                  </FieldLabel>
                  {loadingRepos ? (
                    <Input
                      id="repository"
                      placeholder="Loading repositories..."
                      disabled
                    />
                  ) : (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!githubConnected}
                    >
                      <SelectTrigger
                        id="repository"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Select a repository" />
                      </SelectTrigger>
                      <SelectContent>
                        {repositories.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {repoError
                              ? "Failed to load repositories"
                              : "No repositories found"}
                          </div>
                        ) : (
                          repositories.map((repo) => (
                            <SelectItem key={repo.id} value={repo.fullName}>
                              {repo.fullName}
                              {repo.private ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (private)
                                </span>
                              ) : null}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <FieldDescription>
                    {repoError ? (
                      <span className="text-destructive text-sm">
                        {repoError}
                      </span>
                    ) : (
                      "Select a GitHub repository to automatically create issues from feedback. You can change this later in project settings."
                    )}
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError
                      errors={
                        fieldState.error
                          ? [{ message: fieldState.error.message }]
                          : undefined
                      }
                    />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={creating}
              disabled={!githubConnected}
            >
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
