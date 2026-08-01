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
import { createPasswordSchema, CreatePasswordInput } from "@/schemas/password.schema";
import { useCreatePassword, useUpdatePassword, PasswordData } from "@/hooks/usePasswords";
import { useProjectsList } from "@/hooks/useProjects";
import { Loader2 } from "lucide-react";

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string; // pre-populated if called from project tab
  item?: PasswordData;
}

export function PasswordDialog({
  open,
  onOpenChange,
  defaultProjectId,
  item,
}: PasswordDialogProps) {
  const isEdit = !!item;

  // Query projects for project linking dropdown
  const { data: projects = [] } = useProjectsList();

  // Mutations
  const { mutate: createPassword, isPending: isCreatePending } = useCreatePassword();
  const { mutate: updatePassword, isPending: isUpdatePending } = useUpdatePassword();

  const isPending = isCreatePending || isUpdatePending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePasswordInput>({
    resolver: zodResolver(createPasswordSchema) as unknown as Resolver<CreatePasswordInput>,
    defaultValues: {
      label: "",
      username: "",
      secret: "",
      url: null,
      category: "other",
      projectId: null,
      notes: "",
    },
  });

  // Reset form when dialog opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset({
        label: "",
        username: "",
        secret: "",
        url: null,
        category: "other",
        projectId: null,
        notes: "",
      });
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          label: item.label,
          username: item.username,
          secret: "", // empty so they can leave it blank to keep unchanged
          url: item.url || null,
          category: item.category,
          projectId: item.projectId || null,
          notes: item.notes || "",
        });
      } else {
        reset({
          label: "",
          username: "",
          secret: "",
          url: null,
          category: "other",
          projectId: defaultProjectId || null,
          notes: "",
        });
      }
    }
  }, [open, item, defaultProjectId, reset]);

  const onSubmit = (data: CreatePasswordInput) => {
    const payload = {
      ...data,
      projectId: data.projectId || null,
      url: data.url || null,
    };

    if (isEdit && item) {
      // In edit mode, if secret is left empty, omit it from PATCH payload
      if (!payload.secret) {
        delete (payload as Partial<CreatePasswordInput>).secret;
      }

      updatePassword(
        { id: item._id, data: payload },
        {
          onSuccess: () => handleOpenChange(false),
        }
      );
    } else {
      createPassword(payload, {
        onSuccess: () => handleOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Credential Details" : "New Credential"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update user credentials, links, or notes."
                : "Add a database password, server access token, API client secret, or SSH key."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <Field data-invalid={!!errors.label}>
              <FieldLabel htmlFor="label">Service Name / Label</FieldLabel>
              <Input
                id="label"
                type="text"
                placeholder="e.g. Production PostgreSQL, AWS Access Key"
                disabled={isPending}
                {...register("label")}
              />
              {errors.label?.message && <FieldError>{errors.label.message}</FieldError>}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="username">Username / ID</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g. pg_user, AKIAIOSFODNN7"
                  disabled={isPending}
                  {...register("username")}
                />
                {errors.username?.message && <FieldError>{errors.username.message}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.secret}>
                <FieldLabel htmlFor="secret">
                  {isEdit ? "New Password (Optional)" : "Password / Key"}
                </FieldLabel>
                <Input
                  id="secret"
                  type="password"
                  placeholder={isEdit ? "••••••••" : "e.g. secret_token_123"}
                  disabled={isPending}
                  {...register("secret")}
                />
                {errors.secret?.message && <FieldError>{errors.secret.message}</FieldError>}
              </Field>
            </div>

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
                  <option value="database">Database</option>
                  <option value="api">API Endpoint</option>
                  <option value="cloud">Cloud / AWS</option>
                  <option value="personal">Personal</option>
                  <option value="shared">Shared</option>
                  <option value="utility">Utility</option>
                  <option value="other">Other</option>
                </select>
                {errors.category?.message && <FieldError>{errors.category.message}</FieldError>}
              </Field>

              {/* Project Link drop-down (visible on global dialog, pre-populated and disabled if defaultProjectId is supplied) */}
              <Field data-invalid={!!errors.projectId}>
                <FieldLabel htmlFor="projectId">Link to Project</FieldLabel>
                <select
                  id="projectId"
                  disabled={isPending || (!!defaultProjectId && !isEdit)}
                  {...register("projectId")}
                  className={`border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none ${
                    defaultProjectId && !isEdit ? "bg-muted cursor-not-allowed opacity-80" : ""
                  }`}
                >
                  <option value="">None (Global Vault Only)</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.projectId?.message && <FieldError>{errors.projectId.message}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errors.url}>
              <FieldLabel htmlFor="url">Website URL (Optional)</FieldLabel>
              <Input
                id="url"
                type="text"
                placeholder="e.g. https://aws.amazon.com"
                disabled={isPending}
                {...register("url")}
              />
              {errors.url?.message && <FieldError>{errors.url.message}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                placeholder="SSH connection commands, key descriptions, or usage instructions..."
                disabled={isPending}
                className="h-16 resize-none text-xs break-all break-words"
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
              onClick={() => handleOpenChange(false)}
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
                "Save credential"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
