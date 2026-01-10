"use client";

import { Button } from "@/components/ui/button";
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
import { createProjectSchema, DOMAIN_REGEX } from "@/lib/schemas";
import { slugify } from "@/lib/slug";
import { startGitHubAppInstallForCreateProject } from "@/server/actions/github/app/install";
import { createProject } from "@/server/actions/projects/create";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import * as React from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { LAST_PROJECT_SLUG_KEY } from "./project-context";

type ProjectForm = z.input<typeof createProjectSchema>;

export function CreateProjectPageClient({
  initialInstallationId,
  repositories,
  repoError,
  installRedirectUrl = "/dashboard/new",
  onProjectCreatedAction,
  onCancelAction,
}: {
  initialInstallationId: string;
  repositories: Array<{
    id: number;
    name: string;
    fullName: string;
    owner: string;
    private: boolean;
    description: string | null;
  }>;
  repoError: string | null;
  installRedirectUrl?: string;
  onProjectCreatedAction?: (project: {
    id: string;
    name: string;
    slug: string;
  }) => void;
  onCancelAction?: () => void;
}) {
  const router = useRouter();

  const [creating, setCreating] = React.useState(false);

  const form = useForm<ProjectForm>({
    // `createProjectSchema` transforms some string inputs into arrays.
    // We keep the form values as the schema input type, and let the server parse/transform.
    resolver: zodResolver(createProjectSchema) as never,
    defaultValues: {
      name: "",
      description: "",
      installationId: initialInstallationId || "",
      repository: "",
      allowedDomains: "",
      defaultLabels: "",
      defaultAssignees: "",
    },
  });

  const nameValue = form.watch("name");
  const slugPreview = React.useMemo(
    () => slugify(nameValue || ""),
    [nameValue],
  );

  const [newDomain, setNewDomain] = React.useState("");
  const [domainError, setDomainError] = React.useState<string | null>(null);

  const allowedDomainsRaw = form.watch("allowedDomains");
  const allowedDomainsList = React.useMemo(() => {
    if (!allowedDomainsRaw) return [];
    if (Array.isArray(allowedDomainsRaw)) {
      return allowedDomainsRaw.map((d) => d.trim()).filter(Boolean);
    }
    return allowedDomainsRaw
      .split(",")
      .map((d: string) => d.trim())
      .filter(Boolean);
  }, [allowedDomainsRaw]);

  const validateDomain = (domain: string): string | null => {
    const trimmed = domain.trim();
    if (!trimmed) return "Domain cannot be empty";
    if (!DOMAIN_REGEX.test(trimmed)) {
      return "Please enter a valid domain (e.g., example.com)";
    }
    return null;
  };

  const addDomain = async () => {
    const domain = newDomain.trim();
    const err = validateDomain(domain);
    if (err) {
      setDomainError(err);
      return;
    }

    const current = allowedDomainsList;
    if (current.includes(domain)) {
      setDomainError("This domain is already in the list");
      return;
    }

    setDomainError(null);
    const next = [...current, domain];
    form.setValue("allowedDomains", next, { shouldDirty: true });
    setNewDomain("");
  };

  const removeDomain = (idx: number) => {
    const next = allowedDomainsList.filter((_, i) => i !== idx);
    form.setValue("allowedDomains", next, { shouldDirty: true });
  };

  const installAction = startGitHubAppInstallForCreateProject.bind(null, {
    redirectUrl: installRedirectUrl,
  });

  const installationId = form.watch("installationId");

  const onSubmit: SubmitHandler<ProjectForm> = async (data) => {
    if (!data.installationId) {
      toast.error("Please install the GitHub App to create a project");
      return;
    }

    setCreating(true);
    try {
      const result = await createProject(data);

      if (!result.success || !result.project) {
        throw new Error(result.error || "Failed to create project");
      }

      toast.success("Project created successfully!");

      posthog.capture("project_created", {
        project_id: result.project.id,
        project_name: result.project.name,
        has_description: !!result.project.description,
        has_repository: !!data.repository,
      });

      if (result.project.slug) {
        onProjectCreatedAction?.({
          id: result.project.id,
          name: result.project.name,
          slug: result.project.slug,
        });
        try {
          window.localStorage.setItem(
            LAST_PROJECT_SLUG_KEY,
            result.project.slug,
          );
        } catch {
          // ignore
        }
        router.push(`/dashboard/${result.project.slug}/settings?tab=widget`);
      }
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
    <div className="space-y-6" suppressHydrationWarning>
      {!installationId && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950 mt-4">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              GitHub App Required
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Install the BugBuddy GitHub App to select a repository for this
              project.
            </p>
            <form action={installAction}>
              <Button type="submit" className="mt-2" size="sm">
                Install GitHub App
              </Button>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
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
                <FieldDescription>
                  Slug preview:{" "}
                  <code className="px-1 py-0.5 bg-muted rounded">
                    {slugPreview}
                  </code>{" "}
                  (final slug may include a suffix if taken)
                </FieldDescription>
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
            name="installationId"
            control={form.control}
            render={({ field }) => (
              <input type="hidden" {...field} value={field.value || ""} />
            )}
          />

          <Controller
            name="repository"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="repository">GitHub Repository</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!installationId}
                >
                  <SelectTrigger
                    id="repository"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue
                      placeholder={
                        installationId
                          ? "Select a repository"
                          : "Install the GitHub App to load repositories"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {repoError
                          ? "Failed to load repositories"
                          : installationId
                            ? "No repositories found"
                            : "Install the GitHub App to load repositories"}
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
                <FieldDescription>
                  {repoError ? (
                    <span className="text-destructive text-sm">
                      {repoError}
                    </span>
                  ) : (
                    "Select a repository the GitHub App is installed on."
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

          {/* Allowed domains (same UX as Settings): add/remove with validation */}
          <Controller
            name="allowedDomains"
            control={form.control}
            render={({ fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Allowed Domains (optional)</FieldLabel>
                <FieldDescription>
                  Specify which domains can use your widget. Leave empty to
                  allow all domains. Enter domains without protocol (e.g.,
                  example.com).
                </FieldDescription>

                <div className="mt-2 space-y-2">
                  {allowedDomainsList.map((domain: string, index: number) => (
                    <div key={domain} className="flex gap-2 items-center">
                      <Input
                        value={domain}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDomain(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={newDomain}
                          onChange={(e) => {
                            setNewDomain(e.target.value);
                            if (domainError) setDomainError(null);
                          }}
                          className={domainError ? "border-destructive" : ""}
                          placeholder="example.com"
                          aria-invalid={!!domainError}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              await addDomain();
                            }
                          }}
                        />
                      </div>
                      <Button
                        size="icon"
                        type="button"
                        variant="outline"
                        onClick={addDomain}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {domainError && (
                      <FieldError errors={[{ message: domainError }]} />
                    )}
                  </div>
                </div>

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
            name="defaultLabels"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="defaultLabels">
                  Default GitHub Labels (optional)
                </FieldLabel>
                <Input
                  {...field}
                  id="defaultLabels"
                  placeholder="bug, feedback"
                />
                <FieldDescription>
                  Comma-separated labels to apply to issues created from
                  feedback.
                </FieldDescription>
              </Field>
            )}
          />

          <Controller
            name="defaultAssignees"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="defaultAssignees">
                  Default GitHub Assignees (optional)
                </FieldLabel>
                <Input
                  {...field}
                  id="defaultAssignees"
                  placeholder="username1, username2"
                />
                <FieldDescription>
                  Comma-separated GitHub usernames to auto-assign on issue
                  creation.
                </FieldDescription>
              </Field>
            )}
          />
        </FieldGroup>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onCancelAction ? onCancelAction() : router.push("/dashboard")
            }
          >
            Cancel
          </Button>
          <Button type="submit" loading={creating} disabled={!installationId}>
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
}
