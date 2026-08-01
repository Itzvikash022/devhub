"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  confirmDocumentSchema,
  ConfirmDocumentInput,
  updateDocumentSchema,
  UpdateDocumentInput,
} from "@/schemas/document.schema";
import {
  usePresignDocument,
  useConfirmDocument,
  useUpdateDocument,
  DocumentData,
} from "@/hooks/useDocuments";
import { useProjectsList } from "@/hooks/useProjects";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { MAX_DOCUMENT_SIZE } from "@/constants/app.constants";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  item?: DocumentData;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  defaultProjectId,
  item,
}: DocumentUploadDialogProps) {
  const isEdit = !!item;
  const { data: projects = [] } = useProjectsList();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: presignDoc, isPending: isPendingPresign } =
    usePresignDocument(defaultProjectId);
  const { mutateAsync: confirmDoc, isPending: isPendingConfirm } = useConfirmDocument();
  const { mutateAsync: updateDoc, isPending: isPendingUpdate } = useUpdateDocument();

  const isPending = isPendingPresign || isUploading || isPendingConfirm || isPendingUpdate;

  // React Hook Form for confirm metadata schema
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ConfirmDocumentInput>({
    resolver: zodResolver(
      isEdit ? updateDocumentSchema : confirmDocumentSchema
    ) as unknown as Resolver<ConfirmDocumentInput>,
    defaultValues: {
      title: "",
      r2Key: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
      category: "other",
      projectId: null,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset({
        title: "",
        r2Key: "",
        fileName: "",
        fileType: "",
        fileSize: 0,
        category: "other",
        projectId: null,
      });
      setSelectedFile(null);
      setFileName("");
      setIsUploading(false);
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          title: item.title,
          r2Key: item.r2Key,
          fileName: item.fileName,
          fileType: item.fileType,
          fileSize: item.fileSize,
          category: item.category,
          projectId: item.projectId || null,
        });
      } else {
        reset({
          title: "",
          r2Key: "",
          fileName: "",
          fileType: "",
          fileSize: 0,
          category: "other",
          projectId: defaultProjectId || null,
        });
      }
    }
  }, [open, item, defaultProjectId, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOCUMENT_SIZE) {
      toast.error(`Document size must not exceed ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);

    // Auto-fill Title with file base name
    const cleanName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    setValue("title", cleanName);
    setValue("fileName", file.name);
    setValue("fileType", file.type);
    setValue("fileSize", file.size);
  };

  const onSubmit = async (data: ConfirmDocumentInput) => {
    if (isEdit && item) {
      // Edit Mode
      try {
        const updatePayload: UpdateDocumentInput = {
          title: data.title,
          category: data.category,
          projectId: data.projectId || null,
        };

        await updateDoc({ id: item._id, data: updatePayload });
        handleOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update document.");
      }
    } else {
      // Create Mode
      if (!selectedFile) {
        toast.error("Please select a document file to upload.");
        return;
      }

      try {
        // 1. Fetch R2 upload details
        const { uploadUrl, r2Key } = await presignDoc({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        });

        // 2. Perform direct R2 PUT upload
        setIsUploading(true);
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": selectedFile.type,
          },
          body: selectedFile,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload document file directly to R2.");
        }

        setIsUploading(false);

        // 3. Confirm metadata upload
        await confirmDoc({
          ...data,
          r2Key,
        });

        handleOpenChange(false);
      } catch (err) {
        setIsUploading(false);
        toast.error(err instanceof Error ? err.message : "Document upload failed.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Document Metadata" : "Upload Document"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update spec title, category tag, or project linking references."
                : "Select a spec, design brief, or contract. Files are uploaded directly to secure R2."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-left">
            {/* File selection dropzone (hidden during edit mode) */}
            {!isEdit && (
              <div className="border-border hover:border-primary/60 bg-muted/5 group relative cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={isPending}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="space-y-2">
                  <Upload className="text-muted-foreground group-hover:text-primary mx-auto h-8 w-8 transition-colors" />
                  <div className="text-muted-foreground text-xs">
                    {fileName ? (
                      <span className="text-foreground font-semibold">{fileName}</span>
                    ) : (
                      <span>Click or drag specifications file here (Max 25MB)</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="title">Document Title</FieldLabel>
              <Input
                id="title"
                type="text"
                placeholder="e.g. Project Specs Sheet V2"
                disabled={isPending}
                {...register("title")}
              />
              {errors.title?.message && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <select
                  id="category"
                  disabled={isPending}
                  {...register("category")}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="requirement">Requirement</option>
                  <option value="contract">Contract</option>
                  <option value="specification">Specification</option>
                  <option value="architecture">Architecture</option>
                  <option value="meeting-report">Meeting Report</option>
                  <option value="research">Research Log</option>
                  <option value="other">Other</option>
                </select>
                {errors.category?.message && <FieldError>{errors.category.message}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.projectId}>
                <FieldLabel htmlFor="projectId">Link to Project</FieldLabel>
                <select
                  id="projectId"
                  disabled={isPending}
                  {...register("projectId")}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
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
            <Button type="submit" disabled={isPending || (!isEdit && !selectedFile)}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "Uploading to R2..." : "Saving..."}
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Upload Document"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
