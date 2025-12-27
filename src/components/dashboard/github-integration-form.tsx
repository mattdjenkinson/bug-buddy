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
import { clientEnv } from "@/env";
import { generateWebhookSecret } from "@/server/actions/github/generate-webhook-secret";
import { saveGitHubIntegration } from "@/server/actions/github/integration";
import { getUserRepositories } from "@/server/actions/github/repositories";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const githubIntegrationSchema = z.object({
  projectId: z.string(),
  personalAccessToken: z.string().optional(), // Optional - will use OAuth token if not provided
  repository: z.string().min(1, "Repository is required"), // Format: "owner/repo"
  defaultLabels: z.string().optional(),
  defaultAssignees: z.string().optional(),
});

type GitHubIntegrationForm = z.infer<typeof githubIntegrationSchema>;

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
}

export function GitHubIntegrationForm({
  projectId,
  initialData,
}: GitHubIntegrationFormProps) {
  const [saving, setSaving] = React.useState(false);
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
  const [copiedWebhookUrl, setCopiedWebhookUrl] = React.useState(false);
  const [webhookSecret, setWebhookSecret] = React.useState<string | null>(
    initialData?.webhookSecret || null,
  );
  const [copiedWebhookSecret, setCopiedWebhookSecret] = React.useState(false);
  const [generatingSecret, setGeneratingSecret] = React.useState(false);

  const initialRepository = initialData
    ? `${initialData.repositoryOwner}/${initialData.repositoryName}`
    : "";

  const form = useForm<GitHubIntegrationForm>({
    resolver: zodResolver(githubIntegrationSchema),
    defaultValues: {
      projectId,
      personalAccessToken: initialData?.personalAccessToken || "",
      repository: initialRepository,
      defaultLabels: initialData?.defaultLabels.join(", ") || "",
      defaultAssignees: initialData?.defaultAssignees.join(", ") || "",
    },
  });

  // Fetch repositories on mount
  React.useEffect(() => {
    async function fetchRepos() {
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
    }

    fetchRepos();
  }, []);

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

  const webhookUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/api/github/webhook`;
  const selectedRepository = form.watch("repository");
  const [repositoryOwner, repositoryName] = selectedRepository
    ? selectedRepository.split("/")
    : [null, null];

  const githubWebhookSettingsUrl =
    repositoryOwner && repositoryName
      ? `https://github.com/${repositoryOwner}/${repositoryName}/settings/hooks`
      : null;

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
          ? data.defaultLabels.split(",").map((l) => l.trim())
          : [],
        defaultAssignees: data.defaultAssignees
          ? data.defaultAssignees.split(",").map((a) => a.trim())
          : [],
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save GitHub integration");
      }

      toast.success("GitHub integration saved successfully!");
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
                    {repoError
                      ? `Error: ${repoError}. You can still provide a Personal Access Token below.`
                      : "Select a repository from your GitHub account. We'll use your GitHub OAuth token to connect."}
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
                    your OAuth token. Create a token with repo permissions at{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GitHub Settings
                    </a>
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

            <Button type="submit" disabled={saving} loading={saving}>
              Save GitHub Integration
            </Button>
          </FieldGroup>
        </form>

        {(selectedRepository || initialData) && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Webhook Setup</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure a webhook in GitHub to sync issue status changes and
                  comments back to Bug Buddy.
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
                    <RefreshCw className="mr-2 h-4 w-4" />
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
                <p className="font-medium mb-1">What does the webhook do?</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Syncs issue status changes (closed/reopened) to Bug Buddy
                  </li>
                  <li>Syncs comments from GitHub issues to Bug Buddy</li>
                  <li>Keeps your dashboard up-to-date with GitHub activity</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
