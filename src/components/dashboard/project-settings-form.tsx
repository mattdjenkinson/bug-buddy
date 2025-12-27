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
import { deleteProject } from "@/server/actions/projects/delete";
import { refreshApiKey } from "@/server/actions/projects/refresh-api-key";
import { updateProject } from "@/server/actions/projects/update";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Spinner } from "../ui/spinner";

const projectSettingsSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  allowedDomains: z.array(z.string()).default([]),
});

type ProjectSettingsForm = z.infer<typeof projectSettingsSchema>;

interface ProjectSettingsFormProps {
  projectId: string;
  projectName: string;
  apiKey: string;
  allowedDomains?: string[];
}

export function ProjectSettingsForm({
  projectId,
  projectName,
  apiKey,
  allowedDomains = [],
}: ProjectSettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = React.useState(false);
  const [currentApiKey, setCurrentApiKey] = React.useState(apiKey);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [newDomain, setNewDomain] = React.useState("");
  const [savingDomains, setSavingDomains] = React.useState(false);

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
    setCopiedKey(null);
  }, [apiKey, projectId]);

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
        throw new Error(result.error || "Failed to refresh API key");
      }

      if (result.apiKey) {
        setCurrentApiKey(result.apiKey);
        toast.success("API key refreshed successfully!");
        router.refresh();
      }
    } catch (error) {
      console.error("Error refreshing API key:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh API key",
      );
    } finally {
      setRefreshing(false);
      setShowRefreshDialog(false);
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
      router.push("/dashboard/projects");
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
    toast.success("API key copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>
            Manage your project name, API key, and delete the project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name" className="flex items-center gap-2">
                  Project Name {saving && <Spinner />}
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
              <FieldLabel>Allowed Domains</FieldLabel>
              <FieldDescription>
                Specify which domains can use your widget. Leave empty to allow
                all domains. Enter domains without protocol (e.g., example.com).
              </FieldDescription>
              {savingDomains && (
                <span className="text-sm text-muted-foreground">Saving...</span>
              )}
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
                <div className="flex gap-2">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="max-w-xs"
                    placeholder="example.com"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const domain = newDomain.trim();
                        if (domain) {
                          const current = form.getValues("allowedDomains");
                          if (!current.includes(domain)) {
                            const newDomains = [...current, domain];
                            form.setValue("allowedDomains", newDomains);
                            setNewDomain("");
                            await saveAllowedDomains(newDomains);
                          }
                        }
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const domain = newDomain.trim();
                      if (domain) {
                        const current = form.getValues("allowedDomains");
                        if (!current.includes(domain)) {
                          const newDomains = [...current, domain];
                          form.setValue("allowedDomains", newDomains);
                          setNewDomain("");
                          await saveAllowedDomains(newDomains);
                        }
                      }
                    }}
                    disabled={savingDomains}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Field>
          </div>

          <div className="mt-6 border-t pt-6">
            <Field>
              <FieldLabel>API Key</FieldLabel>
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
                Your API key is used to authenticate widget requests. Keep it
                secure.
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
              Refresh API Key
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
            <DialogTitle>Refresh API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to refresh the API key? The old key will no
              longer work and you&apos;ll need to update any widgets using it.
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
              Refresh API Key
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
