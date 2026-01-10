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
import { Separator } from "@/components/ui/separator";
import { githubIntegrationFormSchema } from "@/lib/schemas";
import { startGitHubAppInstall } from "@/server/actions/github/app/install";
import { getProjectInstallationRepositories } from "@/server/actions/github/app/installation-repositories";
import { saveGitHubIntegration } from "@/server/actions/github/integration";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type GitHubIntegrationForm = z.infer<typeof githubIntegrationFormSchema>;

interface GitHubAppIntegrationFormProps {
  projectId: string;
  initialData?: {
    repositoryOwner: string;
    repositoryName: string;
    defaultLabels: string[];
    defaultAssignees: string[];
    installationId: string | null;
  } | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function GitHubAppIntegrationForm({
  projectId,
  initialData,
  onDirtyChange,
}: GitHubAppIntegrationFormProps) {
  const [saving, setSaving] = React.useState(false);
  const params = useParams<{ projectSlug?: string }>();
  const projectSlug =
    typeof params.projectSlug === "string" ? params.projectSlug : null;

  const initialRepository = initialData
    ? `${initialData.repositoryOwner}/${initialData.repositoryName}`
    : "";

  const form = useForm<GitHubIntegrationForm>({
    resolver: zodResolver(githubIntegrationFormSchema),
    defaultValues: {
      projectId,
      repository: initialRepository,
      defaultLabels: initialData?.defaultLabels.join(", ") || "",
      defaultAssignees: initialData?.defaultAssignees.join(", ") || "",
    },
  });

  // Track dirty state and notify parent
  const isDirty = form.formState.isDirty;
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Fetch repositories using React Query
  const {
    data: repositoriesData,
    isLoading: loadingRepos,
    error: repoErrorResponse,
  } = useQuery({
    queryKey: [
      "github-app-repositories",
      projectId,
      initialData?.installationId,
    ],
    queryFn: async () => {
      if (!initialData?.installationId) {
        return [];
      }

      const result = await getProjectInstallationRepositories({ projectId });
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch repositories");
      }
      return result.repositories;
    },
    enabled: !!initialData?.installationId,
    retry: false,
  });

  const repositories = repositoriesData || [];
  const repoError = repoErrorResponse
    ? (repoErrorResponse as Error).message
    : null;

  React.useEffect(() => {
    const initialRepository = initialData
      ? `${initialData.repositoryOwner}/${initialData.repositoryName}`
      : "";
    form.reset({
      projectId,
      repository: initialRepository,
      defaultLabels: initialData?.defaultLabels.join(", ") || "",
      defaultAssignees: initialData?.defaultAssignees.join(", ") || "",
    });
  }, [projectId, initialData, form]);

  const installAction = startGitHubAppInstall.bind(null, {
    projectId,
    redirectUrl: projectSlug
      ? `/dashboard/${projectSlug}/settings?tab=github`
      : `/dashboard/settings?project=${projectId}&tab=github`,
  });

  const onSubmit = async (data: GitHubIntegrationForm) => {
    setSaving(true);
    try {
      const [repositoryOwner, repositoryName] = data.repository.split("/");
      if (!repositoryOwner || !repositoryName) {
        throw new Error(
          "Invalid repository format. Please select a repository.",
        );
      }

      const result = await saveGitHubIntegration({
        projectId: data.projectId,
        repositoryOwner,
        repositoryName,
        defaultLabels: data.defaultLabels
          ? data.defaultLabels.split(",").map((l: string) => l.trim())
          : [],
        defaultAssignees: data.defaultAssignees
          ? data.defaultAssignees.split(",").map((a: string) => a.trim())
          : [],
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save GitHub integration");
      }

      toast.success("GitHub integration saved successfully!");
      form.reset(form.getValues(), { keepValues: true });
    } catch (error) {
      console.error("Error saving GitHub integration:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save GitHub integration",
      );
    } finally {
      setSaving(false);
    }
  };

  const installationId = initialData?.installationId || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Integration</CardTitle>
        <CardDescription>
          Link a repository, install the BugBuddy GitHub App, and BugBuddy will
          create issues as the app (not as your user).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">GitHub App</p>
                <p className="text-sm text-muted-foreground">
                  Install the app on the repository to enable issue creation and
                  status sync.
                </p>
              </div>
              <Badge variant={installationId ? "default" : "destructive"}>
                {installationId ? "Installed" : "Not installed"}
              </Badge>
            </div>

            {!installationId ? (
              <form action={installAction}>
                <Button type="submit">Install GitHub App</Button>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">
                Installation ID:{" "}
                <code className="px-1 py-0.5 bg-muted rounded">
                  {installationId}
                </code>
              </p>
            )}

            <Separator />

            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Sync is handled automatically by BugBuddy when the GitHub App is
              installed.
            </div>
          </div>

          <Separator />

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="repository"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="repository">Repository</FieldLabel>
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
                      >
                        <SelectTrigger
                          id="repository"
                          aria-invalid={fieldState.invalid}
                          className="max-w-xs"
                        >
                          <SelectValue placeholder="Select a repository" />
                        </SelectTrigger>
                        <SelectContent>
                          {repositories.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No repositories found
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
                        <span>Error: {repoError}</span>
                      ) : (
                        "Select the repository BugBuddy should create issues in."
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

              <Controller
                name="defaultLabels"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="defaultLabels">
                      Default Labels (comma-separated)
                    </FieldLabel>
                    <Input
                      {...field}
                      id="defaultLabels"
                      placeholder="bug, feedback"
                      aria-invalid={fieldState.invalid}
                    />
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

              <Controller
                name="defaultAssignees"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="defaultAssignees">
                      Default Assignees (comma-separated)
                    </FieldLabel>
                    <Input
                      {...field}
                      id="defaultAssignees"
                      placeholder="username1, username2"
                      aria-invalid={fieldState.invalid}
                    />
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

            {!installationId ? (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
                Install the GitHub App to enable issue creation and sync.
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              className="mt-4"
            >
              Save GitHub Integration
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
