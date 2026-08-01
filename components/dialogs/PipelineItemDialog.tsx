"use client";

import { useForm, Resolver } from "react-hook-form";
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
import { createPipelineItemSchema, CreatePipelineItemInput } from "@/schemas/pipeline.schema";
import {
  useCreatePipelineItem,
  useUpdatePipelineItem,
  PipelineItemData,
} from "@/hooks/usePipeline";
import { Loader2 } from "lucide-react";

interface PipelineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  item?: PipelineItemData;
}

export function PipelineItemDialog({
  open,
  onOpenChange,
  projectId,
  item,
}: PipelineItemDialogProps) {
  const isEdit = !!item;

  // Mutations
  const { mutate: createItem, isPending: isCreatePending } = useCreatePipelineItem(projectId);
  const { mutate: updateItem, isPending: isUpdatePending } = useUpdatePipelineItem(projectId);

  const isPending = isCreatePending || isUpdatePending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePipelineItemInput>({
    resolver: zodResolver(createPipelineItemSchema) as unknown as Resolver<CreatePipelineItemInput>,
    defaultValues: {
      category: "repository",
      label: "",
      url: "",
      environment: null,
      notes: "",
    },
  });

  // Reset form values on task dialog open/change
  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          category: item.category,
          label: item.label,
          url: item.url,
          environment: item.environment || null,
          notes: item.notes || "",
        });
      } else {
        reset({
          category: "repository",
          label: "",
          url: "",
          environment: null,
          notes: "",
        });
      }
    }
  }, [open, item, reset]);

  const onSubmit = (data: CreatePipelineItemInput) => {
    // Standardize null/empty strings for environment
    const payload = {
      ...data,
      environment: data.environment || null,
    };

    if (isEdit && item) {
      updateItem(
        { id: item._id, data: payload },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createItem(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Resource Details" : "New Resource"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update your deployment target, links, or environmental properties."
                : "Add a repository link, hosting server, monitoring console, or database connection for reference."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field data-invalid={!!errors.label}>
              <FieldLabel htmlFor="label">Resource Label / Name</FieldLabel>
              <Input
                id="label"
                type="text"
                placeholder="e.g. GitHub Repository, Production Server"
                disabled={isPending}
                {...register("label")}
              />
              {errors.label?.message && <FieldError>{errors.label.message}</FieldError>}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <select
                  id="category"
                  disabled={isPending}
                  {...register("category")}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="repository">Repository</option>
                  <option value="hosting">Hosting</option>
                  <option value="domain">Domain</option>
                  <option value="database">Database</option>
                  <option value="storage">Storage</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="analytics">Analytics</option>
                  <option value="ci-cd">CI/CD</option>
                  <option value="api">API Endpoint</option>
                  <option value="docs">Documentation</option>
                  <option value="other">Other</option>
                </select>
                {errors.category?.message && <FieldError>{errors.category.message}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.environment}>
                <FieldLabel htmlFor="environment">Environment Tag</FieldLabel>
                <select
                  id="environment"
                  disabled={isPending}
                  {...register("environment")}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None (Global)</option>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
                {errors.environment?.message && (
                  <FieldError>{errors.environment.message}</FieldError>
                )}
              </Field>
            </div>

            <Field data-invalid={!!errors.url}>
              <FieldLabel htmlFor="url">URL / Path</FieldLabel>
              <Input
                id="url"
                type="text"
                placeholder="e.g. https://github.com/user/project, 192.168.1.1"
                disabled={isPending}
                {...register("url")}
              />
              {errors.url?.message && <FieldError>{errors.url.message}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Connection passwords, server SSH credentials locations, or notes..."
                disabled={isPending}
                className="h-16 resize-none"
                {...register("notes")}
              />
              {errors.notes?.message && <FieldError>{errors.notes.message}</FieldError>}
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
                "Add resource"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
