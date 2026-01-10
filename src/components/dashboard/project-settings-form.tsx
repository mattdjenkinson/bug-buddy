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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DOMAIN_REGEX } from "@/lib/schemas";
import { deleteProject } from "@/server/actions/projects/delete";
import { refreshApiKey } from "@/server/actions/projects/refresh-api-key";
import { refreshSecretKey } from "@/server/actions/projects/refresh-secret-key";
import { updateProject } from "@/server/actions/projects/update";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Spinner } from "../ui/spinner";

const projectSettingsSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  allowedDomains: z.array(
    z
      .string()
      .regex(
        DOMAIN_REGEX,
        "Invalid domain format. Please use format like example.com",
      ),
  ),
});

type ProjectSettingsForm = z.infer<typeof projectSettingsSchema>;

interface ProjectSettingsFormProps {
  projectId: string;
  projectName: string;
  apiKey: string;
  secretKey: string | null;
  allowedDomains?: string[];
}

export function ProjectSettingsForm({
  projectId,
  projectName,
  apiKey,
  secretKey: initialSecretKey,
  allowedDomains = [],
}: ProjectSettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshingSecret, setRefreshingSecret] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = React.useState(false);
  const [showRefreshSecretDialog, setShowRefreshSecretDialog] =
    React.useState(false);
  const [currentApiKey, setCurrentApiKey] = React.useState(apiKey);
  const [currentSecretKey, setCurrentSecretKey] =
    React.useState(initialSecretKey);
  const [showSecretKey, setShowSecretKey] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [copiedSecretKey, setCopiedSecretKey] = React.useState(false);
  const [newDomain, setNewDomain] = React.useState("");
  const [savingDomains, setSavingDomains] = React.useState(false);
  const [domainError, setDomainError] = React.useState<string | null>(null);

  const validateDomain = (domain: string): string | null => {
    const trimmed = domain.trim();
    if (!trimmed) {
      return "Domain cannot be empty";
    }
    if (!DOMAIN_REGEX.test(trimmed)) {
      return "Please enter a valid domain (e.g., example.com)";
    }
    return null;
  };

  const handleAddDomain = async () => {
    const domain = newDomain.trim();
    const error = validateDomain(domain);

    if (error) {
      setDomainError(error);
      return;
    }

    setDomainError(null);
    const current = form.getValues("allowedDomains");
    if (current.includes(domain)) {
      setDomainError("This domain is already in the list");
      return;
    }

    const newDomains = [...current, domain];
    form.setValue("allowedDomains", newDomains);
    setNewDomain("");
    await saveAllowedDomains(newDomains);
  };

  const form = useForm<ProjectSettingsForm>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: projectName,
      allowedDomains: allowedDomains,
    },
  });

  React.useEffect(() => {
    form.reset({
      name: projectName,
      allowedDomains: allowedDomains,
    });
  }, [projectName, allowedDomains, form]);

  React.useEffect(() => {
    setCurrentApiKey(apiKey);
    setCurrentSecretKey(initialSecretKey);
    setCopiedKey(null);
    setCopiedSecretKey(false);
  }, [apiKey, initialSecretKey, projectId]);

  const saveAllowedDomains = async (domains: string[]) => {
    setSavingDomains(true);
    try {
      const result = await updateProject({
        projectId,
        name: form.getValues("name"),
        allowedDomains: domains,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update allowed domains");
      }

      toast.success("Allowed domains updated");
      router.refresh();
    } catch (error) {
      console.error("Error updating allowed domains:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update allowed domains",
      );
    } finally {
      setSavingDomains(false);
    }
  };

  const saveProjectName = React.useCallback(
    async (name: string) => {
      setSaving(true);
      try {
        const result = await updateProject({
          projectId,
          name,
          allowedDomains: form.getValues("allowedDomains"),
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update project");
        }

        toast.success("Project name updated");
        router.refresh();
      } catch (error) {
        console.error("Error updating project:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update project name",
        );
      } finally {
        setSaving(false);
      }
    },
    [projectId, form, router],
  );

  // Debounce name changes
  const nameTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const watchedName = form.watch("name");

  React.useEffect(() => {
    if (watchedName && watchedName !== projectName) {
      if (nameTimeoutRef.current) {
        clearTimeout(nameTimeoutRef.current);
      }
      nameTimeoutRef.current = setTimeout(() => {
        if (watchedName && watchedName !== projectName) {
          saveProjectName(watchedName);
        }
      }, 1000);
    }

    return () => {
      if (nameTimeoutRef.current) {
        clearTimeout(nameTimeoutRef.current);
      }
    };
  }, [watchedName, projectName, saveProjectName]);

  const handleRefreshApiKey = async () => {
    setRefreshing(true);
    try {
      const result = await refreshApiKey({ projectId });

      if (!result.success) {
        throw new Error(result.error || "Failed to refresh client key");
      }

      if (result.apiKey) {
        setCurrentApiKey(result.apiKey);
        toast.success("Client key refreshed successfully!");
        router.refresh();
      }
    } catch (error) {
      console.error("Error refreshing client key:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh client key",
      );
    } finally {
      setRefreshing(false);
      setShowRefreshDialog(false);
    }
  };

  const handleRefreshSecretKey = async () => {
    setRefreshingSecret(true);
    try {
      const result = await refreshSecretKey({ projectId });

      if (!result.success) {
        throw new Error(result.error || "Failed to refresh secret key");
      }

      if (result.secretKey) {
        setCurrentSecretKey(result.secretKey);
        toast.success("Secret key refreshed successfully!");
        router.refresh();
      }
    } catch (error) {
      console.error("Error refreshing secret key:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh secret key",
      );
    } finally {
      setRefreshingSecret(false);
      setShowRefreshSecretDialog(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const result = await deleteProject({ projectId });

      if (!result.success) {
        throw new Error(result.error || "Failed to delete project");
      }

      toast.success("Project deleted successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete project",
      );
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(currentApiKey);
    setCopiedKey(currentApiKey);
    toast.success("Client key copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copySecretKey = () => {
    if (!currentSecretKey) return;
    navigator.clipboard.writeText(currentSecretKey);
    setCopiedSecretKey(true);
    toast.success("Secret key copied to clipboard!");
    setTimeout(() => setCopiedSecretKey(false), 2000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>
            Manage your project name, client key, secret key, and delete the
            project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name" className="flex items-center gap-2">
                  Project Name {saving && <Spinner className="size-3" />}
                </FieldLabel>
                <div className="flex gap-2 items-center">
                  <Input
                    className="max-w-xs"
                    {...form.register("name")}
                    id="name"
                    placeholder="My Project"
                    aria-invalid={!!form.formState.errors.name}
                  />
                </div>
                {form.formState.errors.name && (
                  <FieldError
                    errors={[
                      { message: form.formState.errors.name.message || "" },
                    ]}
                  />
                )}
              </Field>
            </FieldGroup>
          </form>

          <div className="mt-6 space-y-4 border-t pt-6">
            <Field>
              <FieldLabel className="flex items-center gap-2">
                Allowed Domains{" "}
                {savingDomains && <Spinner className="size-3" />}
              </FieldLabel>
              <FieldDescription>
                Specify which domains can use your widget. Leave empty to allow
                all domains. Enter domains without protocol (e.g., example.com).
              </FieldDescription>

              <div className="mt-2 space-y-2">
                {form.watch("allowedDomains").map((domain, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={domain}
                      readOnly
                      className="font-mono text-sm max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        const current = form.getValues("allowedDomains");
                        const newDomains = current.filter(
                          (_, i) => i !== index,
                        );
                        form.setValue("allowedDomains", newDomains);
                        await saveAllowedDomains(newDomains);
                      }}
                      disabled={savingDomains}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 max-w-xs">
                      <Input
                        value={newDomain}
                        onChange={(e) => {
                          setNewDomain(e.target.value);
                          // Clear error when user starts typing
                          if (domainError) {
                            setDomainError(null);
                          }
                        }}
                        className={domainError ? "border-destructive" : ""}
                        placeholder="example.com"
                        aria-invalid={!!domainError}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            await handleAddDomain();
                          }
                        }}
                      />
                    </div>
                    <Button
                      size="icon"
                      type="button"
                      variant="outline"
                      onClick={handleAddDomain}
                      disabled={savingDomains}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {domainError && (
                    <FieldError errors={[{ message: domainError }]} />
                  )}
                </div>
              </div>
            </Field>
          </div>

          <div className="mt-6 border-t pt-6">
            <Field>
              <FieldLabel className="flex items-center gap-2">
                Client Key {refreshing && <Spinner className="size-3" />}
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={currentApiKey}
                  readOnly
                  className="font-mono text-xs max-w-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={copyApiKey}
                >
                  {copiedKey === currentApiKey ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FieldDescription>
                Your client key is used to identify your widget. Keep it secure.
              </FieldDescription>
            </Field>

            <Button
              variant="outline"
              type="button"
              onClick={() => setShowRefreshDialog(true)}
              disabled={refreshing}
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Client Key
            </Button>
          </div>

          <div className="mt-6 border-t pt-6">
            <Field>
              <FieldLabel className="flex items-center gap-2">
                Secret Key {refreshingSecret && <Spinner className="size-3" />}
              </FieldLabel>
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Input
                    type={showSecretKey ? "text" : "password"}
                    value={currentSecretKey || ""}
                    readOnly
                    className="font-mono text-xs pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={copySecretKey}
                  disabled={!currentSecretKey}
                >
                  {copiedSecretKey ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FieldDescription>
                Your secret key is used to authenticate widget requests when no
                allowed domains are configured. Keep it secure and never share
                it publicly.
              </FieldDescription>
            </Field>

            <Button
              variant="outline"
              type="button"
              onClick={() => setShowRefreshSecretDialog(true)}
              disabled={refreshingSecret}
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Secret Key
            </Button>
          </div>

          <div className="mt-6 space-y-4 border-t pt-6">
            <Field>
              <FieldLabel>Danger Zone</FieldLabel>
              <FieldDescription>
                Once you delete a project, there is no going back. Please be
                certain.
              </FieldDescription>
            </Field>

            <Button
              variant="destructive"
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh Client Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to refresh the client key? The old key will
              no longer work and you&apos;ll need to update any widgets using
              it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefreshDialog(false)}
              disabled={refreshing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleRefreshApiKey}
              disabled={refreshing}
              loading={refreshing}
            >
              Refresh Client Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRefreshSecretDialog}
        onOpenChange={setShowRefreshSecretDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh Secret Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to refresh the secret key? The old key will
              no longer work and you&apos;ll need to update any widgets using
              it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefreshSecretDialog(false)}
              disabled={refreshingSecret}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleRefreshSecretKey}
              disabled={refreshingSecret}
              loading={refreshingSecret}
            >
              Refresh Secret Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot
              be undone. All feedback, GitHub integrations, and widget
              customizations associated with this project will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deleting}
              loading={deleting}
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
