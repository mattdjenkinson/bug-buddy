"use client";

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
import { getBaseUrlClient } from "@/lib/base-url.client";
import { githubIntegrationFormSchema } from "@/lib/schemas";
import { generateWebhookSecret } from "@/server/actions/github/generate-webhook-secret";
import { saveGitHubIntegration } from "@/server/actions/github/integration";
import { getUserRepositories } from "@/server/actions/github/repositories";
import { verifyWebhook } from "@/server/actions/github/verify-webhook";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import posthog from "posthog-js";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type GitHubIntegrationForm = z.infer<typeof githubIntegrationFormSchema>;

interface GitHubIntegrationFormProps {
  projectId: string;
  initialData?: {
    personalAccessToken: string | null;
    repositoryOwner: string;
    repositoryName: string;
    defaultLabels: string[];
    defaultAssignees: string[];
    webhookSecret: string | null;
  } | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function GitHubIntegrationForm({
  projectId,
  initialData,
  onDirtyChange,
}: GitHubIntegrationFormProps) {
  const [saving, setSaving] = React.useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = React.useState(false);
  const [webhookSecret, setWebhookSecret] = React.useState<string | null>(
    initialData?.webhookSecret || null,
  );
  const [copiedWebhookSecret, setCopiedWebhookSecret] = React.useState(false);
  const [generatingSecret, setGeneratingSecret] = React.useState(false);
  const queryClient = useQueryClient();

  const initialRepository = initialData
    ? `${initialData.repositoryOwner}/${initialData.repositoryName}`
    : "";

  const form = useForm<GitHubIntegrationForm>({
    resolver: zodResolver(githubIntegrationFormSchema),
    defaultValues: {
      projectId,
      personalAccessToken: initialData?.personalAccessToken || "",
      repository: initialRepository,
      defaultLabels: initialData?.defaultLabels.join(", ") || "",
      defaultAssignees: initialData?.defaultAssignees.join(", ") || "",
    },
  });

  // Fetch repositories using React Query
  const {
    data: repositoriesData,
    isLoading: loadingRepos,
    error: repoErrorResponse,
  } = useQuery({
    queryKey: ["github-repositories"],
    queryFn: async () => {
      const result = await getUserRepositories();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch repositories");
      }
      return result.repositories;
    },
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
      personalAccessToken: initialData?.personalAccessToken || "",
      repository: initialRepository,
      defaultLabels: initialData?.defaultLabels.join(", ") || "",
      defaultAssignees: initialData?.defaultAssignees.join(", ") || "",
    });
    setWebhookSecret(initialData?.webhookSecret || null);
  }, [projectId, initialData, form]);

  // Track dirty state and notify parent
  const isDirty = form.formState.isDirty;
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const webhookUrl = `${getBaseUrlClient()}/api/github/webhook`;
  const selectedRepository = form.watch("repository");
  const [repositoryOwner, repositoryName] = selectedRepository
    ? selectedRepository.split("/")
    : [null, null];

  const githubWebhookSettingsUrl =
    repositoryOwner && repositoryName
      ? `https://github.com/${repositoryOwner}/${repositoryName}/settings/hooks`
      : null;

  // Determine if we should verify webhook (has repository or initial data)
  const shouldVerifyWebhook =
    !!selectedRepository ||
    !!(initialData?.repositoryOwner && initialData?.repositoryName);

  // Use React Query to automatically verify webhook status
  const {
    data: webhookStatus,
    isLoading: isCheckingWebhook,
    refetch: refetchWebhookStatus,
  } = useQuery({
    queryKey: ["webhook-status", projectId, selectedRepository],
    queryFn: async () => {
      const result = await verifyWebhook({ projectId });
      if (!result.success) {
        throw new Error(result.error || "Failed to verify webhook");
      }

      const verifiedResult = result as {
        success: true;
        configured: boolean;
        webhookId?: number;
        error?: string;
        details?: {
          url: string;
          events: string[];
          active: boolean;
        };
      };

      return {
        configured: verifiedResult.configured || false,
        error: verifiedResult.error,
        details: verifiedResult.details,
      };
    },
    enabled: shouldVerifyWebhook,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhookUrl(true);
    toast.success("Webhook URL copied to clipboard!");
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  const copyWebhookSecret = () => {
    if (webhookSecret) {
      navigator.clipboard.writeText(webhookSecret);
      setCopiedWebhookSecret(true);
      toast.success("Webhook secret copied to clipboard!");
      setTimeout(() => setCopiedWebhookSecret(false), 2000);
    }
  };

  const handleGenerateWebhookSecret = async () => {
    setGeneratingSecret(true);
    try {
      const result = await generateWebhookSecret({ projectId });
      if (!result.success) {
        throw new Error(result.error || "Failed to generate webhook secret");
      }

      if (result.webhookSecret) {
        setWebhookSecret(result.webhookSecret);
        toast.success("Webhook secret generated successfully!");

        // Track webhook secret generation
        posthog.capture("github_webhook_secret_generated", {
          project_id: projectId,
        });
      }
    } catch (error) {
      console.error("Error generating webhook secret:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate webhook secret",
      );
    } finally {
      setGeneratingSecret(false);
    }
  };

  const handleVerifyWebhook = async () => {
    try {
      const { data } = await refetchWebhookStatus();
      if (data?.configured) {
        toast.success("Webhook is properly configured!");
      } else {
        toast.warning(data?.error || "Webhook is not properly configured");
      }
    } catch (error) {
      console.error("Error verifying webhook:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to verify webhook",
      );
    }
  };

  const onSubmit = async (data: GitHubIntegrationForm) => {
    setSaving(true);
    try {
      // Parse repository owner and name from "owner/repo" format
      const [repositoryOwner, repositoryName] = data.repository.split("/");

      if (!repositoryOwner || !repositoryName) {
        throw new Error(
          "Invalid repository format. Please select a repository.",
        );
      }

      const result = await saveGitHubIntegration({
        projectId: data.projectId,
        personalAccessToken: data.personalAccessToken || undefined,
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

      // Show warning if webhook creation failed
      if (result.warning) {
        toast.warning(result.warning, { duration: 10000 });
      } else if (result.webhookCreated) {
        toast.success(
          "GitHub integration saved and webhook created successfully!",
        );
        // Automatically verify webhook status after creation
        queryClient.invalidateQueries({
          queryKey: ["webhook-status", projectId],
        });
      } else {
        toast.success("GitHub integration saved successfully!");
      }

      // Reset dirty state after successful save
      form.reset(form.getValues(), { keepValues: true });

      // Track GitHub integration save - key conversion event
      posthog.capture("github_integration_saved", {
        project_id: data.projectId,
        repository: data.repository,
        has_custom_token: !!data.personalAccessToken,
        labels_count: data.defaultLabels
          ? data.defaultLabels.split(",").filter((l) => l.trim()).length
          : 0,
        assignees_count: data.defaultAssignees
          ? data.defaultAssignees.split(",").filter((a) => a.trim()).length
          : 0,
      });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Integration</CardTitle>
        <CardDescription>
          Connect your project to a GitHub repository to automatically create
          issues from feedback.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                      <span>
                        Error: {repoError}.{" "}
                        {repoError.includes("No GitHub account connected") ||
                        repoError.includes("sign in with GitHub") ? (
                          <span>
                            Please connect your GitHub account first. You can do
                            this from the dashboard or account settings. This
                            will only grant repository access and won&apos;t
                            change your login method.
                          </span>
                        ) : repoError.includes("organization") ||
                          repoError.includes("Access denied") ? (
                          <span>
                            If you don&apos;t see organization repositories, you
                            may need to{" "}
                            <a
                              href="https://github.com/settings/connections/applications"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              re-authorize the app
                            </a>{" "}
                            or have your organization approve it. You can also
                            provide a Personal Access Token below.
                          </span>
                        ) : (
                          "You can still provide a Personal Access Token below."
                        )}
                      </span>
                    ) : (
                      <>
                        Select a repository from your GitHub account and
                        organizations. We&apos;ll use your GitHub OAuth token to
                        connect. If you don&apos;t see organization
                        repositories, you may need to have your organization
                        approve it at{" "}
                        <a
                          href="https://github.com/settings/connections/applications"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          GitHub Settings.
                        </a>
                      </>
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
              name="personalAccessToken"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="personalAccessToken">
                    Personal Access Token (Optional)
                  </FieldLabel>
                  <Input
                    {...field}
                    id="personalAccessToken"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx (leave empty to use OAuth token)"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Optional. If provided, this token will be used instead of
                    your OAuth token. Create a token with{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs">
                      repo
                    </code>{" "}
                    and{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs">
                      admin:repo_hook
                    </code>{" "}
                    scopes at{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GitHub Settings
                    </a>
                    . The{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs">
                      admin:repo_hook
                    </code>{" "}
                    scope is required for automatic webhook creation.
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

          {(selectedRepository || initialData) && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Webhook Status</FieldLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyWebhook}
                      disabled={isCheckingWebhook}
                      loading={isCheckingWebhook}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Verify
                    </Button>
                  </div>
                  <div className="mt-2">
                    {isCheckingWebhook ? (
                      <p className="text-sm text-muted-foreground">
                        Checking webhook status...
                      </p>
                    ) : webhookStatus?.configured ? (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">
                        <Check className="h-4 w-4 shrink-0" />
                        <span className="font-medium">
                          Webhook is properly configured and active
                        </span>
                      </div>
                    ) : webhookStatus ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span className="font-medium">
                            {webhookStatus.error ||
                              "Webhook is not properly configured"}
                          </span>
                        </div>
                        {webhookStatus.details && (
                          <div className="ml-6 space-y-1 text-xs text-muted-foreground">
                            <p>
                              URL:{" "}
                              <code className="px-1 py-0.5 bg-muted rounded">
                                {webhookStatus.details.url}
                              </code>
                            </p>
                            <p>
                              Events: {webhookStatus.details.events.join(", ")}
                            </p>
                            <p>
                              Active:{" "}
                              {webhookStatus.details.active ? "Yes" : "No"}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Webhook status will be checked automatically when a
                        repository is selected.
                      </p>
                    )}
                  </div>
                  <FieldDescription>
                    {webhookStatus?.configured
                      ? "Your webhook is properly configured and will sync issue status changes and comments from GitHub."
                      : "Verify that the webhook is properly configured in your GitHub repository. The webhook will be automatically created when you save the integration if your token has the required permissions."}
                  </FieldDescription>
                </Field>

                {webhookStatus &&
                  !webhookStatus.configured &&
                  !isCheckingWebhook && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Manual Webhook Setup
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Configure a webhook in GitHub to sync issue status
                            changes and comments back to Bug Buddy.
                          </p>
                        </div>

                        <Field>
                          <FieldLabel>Webhook URL</FieldLabel>
                          <div className="flex gap-2">
                            <Input
                              value={webhookUrl}
                              readOnly
                              className="font-mono text-sm max-w-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={copyWebhookUrl}
                            >
                              {copiedWebhookUrl ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <FieldDescription>
                            Copy this URL and add it as a webhook in your GitHub
                            repository settings.
                          </FieldDescription>
                        </Field>

                        <Field>
                          <FieldLabel>Webhook Secret</FieldLabel>
                          <div className="flex gap-2">
                            <Input
                              value={webhookSecret || ""}
                              readOnly
                              type="password"
                              placeholder={
                                webhookSecret
                                  ? "••••••••••••••••"
                                  : "No secret generated yet"
                              }
                              className="font-mono text-sm max-w-xs"
                            />
                            {webhookSecret && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={copyWebhookSecret}
                              >
                                {copiedWebhookSecret ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleGenerateWebhookSecret}
                              disabled={generatingSecret}
                              loading={generatingSecret}
                            >
                              <RefreshCw className="h-4 w-4" />
                              {webhookSecret ? "Refresh" : "Generate"}
                            </Button>
                          </div>
                          <FieldDescription>
                            {webhookSecret
                              ? "Copy this secret and paste it in the GitHub webhook secret field for security."
                              : "Generate a webhook secret to secure your webhook endpoint. Copy and paste it in GitHub when setting up the webhook."}
                          </FieldDescription>
                        </Field>

                        <div className="space-y-2">
                          <FieldLabel>Setup Instructions</FieldLabel>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                            <li>
                              Go to your repository settings:{" "}
                              {githubWebhookSettingsUrl ? (
                                <a
                                  href={githubWebhookSettingsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {selectedRepository ||
                                    `${initialData?.repositoryOwner}/${initialData?.repositoryName}`}{" "}
                                  Settings
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">
                                  {selectedRepository ||
                                    `${initialData?.repositoryOwner}/${initialData?.repositoryName}`}{" "}
                                  Settings
                                </span>
                              )}
                            </li>
                            <li>Click &quot;Add webhook&quot;</li>
                            <li>Paste the webhook URL above</li>
                            <li>
                              {webhookSecret
                                ? "Paste the webhook secret above in the Secret field"
                                : "Generate a webhook secret above and paste it in the Secret field"}
                            </li>
                            <li>
                              Set Content type to:{" "}
                              <code className="px-1 py-0.5 bg-muted rounded text-xs">
                                application/json
                              </code>
                            </li>
                            <li>
                              Select events: <strong>Issues</strong> and{" "}
                              <strong>Issue comments</strong>
                            </li>
                            <li>Click &quot;Add webhook&quot;</li>
                          </ol>
                        </div>

                        <div className="rounded-lg bg-muted/50 p-4 text-sm">
                          <p className="font-medium mb-1">
                            What does the webhook do?
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>
                              Syncs issue status changes (closed/reopened) to
                              Bug Buddy
                            </li>
                            <li>
                              Syncs comments from GitHub issues to Bug Buddy
                            </li>
                            <li>
                              Keeps your dashboard up-to-date with GitHub
                              activity
                            </li>
                          </ul>
                        </div>
                      </div>
                    </>
                  )}

                <Button
                  type="submit"
                  disabled={saving}
                  loading={saving}
                  className="mt-4"
                >
                  Save GitHub Integration
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
