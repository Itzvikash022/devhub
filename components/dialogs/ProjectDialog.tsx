"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createProjectSchema, CreateProjectInput } from "@/schemas/project.schema";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { Loader2 } from "lucide-react";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: {
    id: string;
    name: string;
    description: string;
    status: "active" | "on-hold" | "archived";
  };
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const isEdit = !!project;
  const { mutate: createProject, isPending: isCreatePending } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdatePending } = useUpdateProject(project?.id || "");

  const isPending = isCreatePending || isUpdatePending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
    },
  });

  // Reset form when project data or dialog open state changes
  useEffect(() => {
    if (open) {
      if (project) {
        reset({
          name: project.name,
          description: project.description,
          status: project.status,
        });
      } else {
        reset({
          name: "",
          description: "",
          status: "active",
        });
      }
    }
  }, [open, project, reset]);

  const onSubmit = (data: CreateProjectInput) => {
    if (isEdit && project) {
      updateProject(data, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createProject(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-[90vw] overflow-hidden break-words">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update your project workspace details."
                : "Create a new project workspace. You can link global passwords, documents, and calendar events to it."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Project Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Atlas CMS"
                disabled={isPending}
                {...register("name")}
              />
              {errors.name?.message && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Briefly describe what this project builds..."
                disabled={isPending}
                className="h-20 resize-none"
                {...register("description")}
              />
              {errors.description?.message && <FieldError>{errors.description.message}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.status}>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <select
                id="status"
                disabled={isPending}
                className="w-full bg-[#EEF0EA] border border-[#DAD8CE] focus:border-[#4F46C7] rounded-md h-9 px-3 py-1 font-inter text-[14px] focus:outline-none"
                {...register("status")}
              >
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="archived">Archived</option>
              </select>
              {errors.status?.message && <FieldError>{errors.status.message}</FieldError>}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Saving..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
