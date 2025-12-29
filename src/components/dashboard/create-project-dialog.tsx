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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createProjectSchema } from "@/lib/schemas";
import { createProject } from "@/server/actions/projects/create";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const form = useForm<ProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: ProjectForm) => {
    setCreating(true);
    try {
      const result = await createProject(data);

      if (!result.success || !result.project) {
        throw new Error(result.error || "Failed to create project");
      }

      setOpen(false);
      form.reset();
      toast.success("Project created successfully!");

      // Track project creation
      posthog.capture("project_created", {
        project_id: result.project.id,
        project_name: result.project.name,
        has_description: !!result.project.description,
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
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
