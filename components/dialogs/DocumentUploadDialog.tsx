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
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const isEdit = !!item;
  const { data: projects = [] } = useProjectsList();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

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
      extension: null,
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
        extension: null,
      });
      setSelectedFile(null);
      setFileName("");
      setIsUploading(false);
      setUploadProgress(0);
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
          extension: item.extension || null,
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
          extension: null,
        });
      }
    }
  }, [open, item, defaultProjectId, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);
  };

  const processFile = (file: File) => {
    if (file.size > MAX_DOCUMENT_SIZE) {
      toast.error(`Document size must not exceed ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);

    // Auto-fill Title with file base name
    const cleanName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const extension = file.name.split(".").pop()?.toLowerCase() || null;

    // Derive MIME type — browsers sometimes return empty / generic type for text formats
    const extensionMimeMap: Record<string, string> = {
      csv: "text/csv",
      json: "application/json",
      yaml: "text/yaml",
      yml: "text/yaml",
      log: "text/plain",
      md: "text/markdown",
      txt: "text/plain",
      xml: "application/xml",
      html: "text/html",
      svg: "image/svg+xml",
    };
    const rawType = file.type || "";
    const fileType =
      rawType && rawType !== "application/octet-stream"
        ? rawType
        : (extension && extensionMimeMap[extension]) || "application/octet-stream";

    setValue("title", cleanName, { shouldValidate: true });
    setValue("fileName", file.name, { shouldValidate: true });
    setValue("fileType", fileType, { shouldValidate: true });
    setValue("fileSize", file.size, { shouldValidate: true });
    setValue("extension", extension, { shouldValidate: true });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const onSubmit = async (data: ConfirmDocumentInput) => {
    if (isEdit && item) {
      // Edit Mode
      try {
        const updatePayload: UpdateDocumentInput = {
          title: data.title,
          category: data.category,
          projectId: data.projectId || null,
          extension: data.extension || null,
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

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // 1. Get presigned upload URL from R2
        const { uploadUrl, r2Key } = await presignDoc({
          fileName: selectedFile.name,
          fileType: selectedFile.type || "application/octet-stream",
        });

        // 2. Perform direct browser-to-R2 PUT upload with progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl, true);
          xhr.setRequestHeader("Content-Type", selectedFile.type || "application/octet-stream");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentage);
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error during direct upload."));
          xhr.send(selectedFile);
        });

        // 3. Confirm upload in backend MongoDB
        const extension = selectedFile.name.split(".").pop()?.toLowerCase() || null;
        await confirmDoc({
          r2Key,
          title: data.title || selectedFile.name,
          category: data.category || "other",
          projectId: data.projectId || null,
          fileName: selectedFile.name,
          fileType: selectedFile.type || "application/octet-stream",
          fileSize: selectedFile.size,
          extension,
        });

        queryClient.invalidateQueries({ queryKey: ["documents"] });
        handleOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Document upload failed.");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const onInvalid = (errors: Record<string, any>) => {
    const firstErrorKey = Object.keys(errors)[0];
    const firstError = errors[firstErrorKey];
    toast.error(firstError?.message || `Validation error on ${firstErrorKey || "form"}.`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
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
              <div
                className={`relative rounded-lg border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
                  isDragActive
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border hover:border-primary/60 bg-muted/5"
                } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={isPending}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                />
                <div className="space-y-2 pointer-events-none">
                  {isUploading ? (
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                  ) : (
                    <Upload className={`mx-auto h-7 w-7 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                  <div className="text-xs text-muted-foreground">
                    {isUploading ? (
                      <span className="font-semibold text-foreground">
                        Uploading to R2... {uploadProgress}%
                      </span>
                    ) : fileName ? (
                      <span className="text-foreground font-semibold">{fileName}</span>
                    ) : isDragActive ? (
                      <span className="text-primary font-semibold">Drop file here</span>
                    ) : (
                      <span>
                        <span className="text-primary font-semibold">Click to browse</span>{" "}
                        or drag a document here (Max 25MB)
                      </span>
                    )}
                  </div>
                </div>
                {/* Progress Bar */}
                {isUploading && (
                  <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden pointer-events-none">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
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
