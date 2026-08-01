"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
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
import { confirmImageAssetSchema, ConfirmImageAssetInput } from "@/schemas/image-asset.schema";
import { useProjectsList } from "@/hooks/useProjects";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Lock } from "lucide-react";
import { toast } from "sonner";
import { MAX_IMAGE_SIZE } from "@/constants/app.constants";

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export function ImageUploadDialog({ open, onOpenChange, projectId }: ImageUploadDialogProps) {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjectsList();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [passphraseVal, setPassphraseVal] = useState("");
  const [confirmPassphraseVal, setConfirmPassphraseVal] = useState("");
  const [passphraseError, setPassphraseError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projectId, projects, selectedProjectId]);

  const targetProjectId = projectId || selectedProjectId;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ConfirmImageAssetInput>({
    resolver: zodResolver(confirmImageAssetSchema) as unknown as Resolver<ConfirmImageAssetInput>,
    defaultValues: {
      name: "",
      r2Key: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
      category: "mockup",
      description: "",
      expiryDate: null,
      passphrase: null,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset({
        name: "",
        r2Key: "",
        fileName: "",
        fileType: "",
        fileSize: 0,
        category: "mockup",
        description: "",
        expiryDate: null,
        passphrase: null,
      });
      setSelectedFile(null);
      setFileName("");
      setEncryptEnabled(false);
      setPassphraseVal("");
      setConfirmPassphraseVal("");
      setPassphraseError("");
    }
    onOpenChange(isOpen);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Image file size must not exceed ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);

    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    setValue("name", baseName);
    setValue("fileName", file.name);
    setValue("fileType", file.type);
    setValue("fileSize", file.size);
  };

  const onSubmit = async (data: ConfirmImageAssetInput) => {
    if (!selectedFile) {
      toast.error("Please select an image file to upload.");
      return;
    }

    if (!targetProjectId) {
      toast.error("Please select a project to associate with this image.");
      return;
    }

    if (encryptEnabled) {
      if (!passphraseVal || passphraseVal.length < 4) {
        setPassphraseError("Passphrase must be at least 4 characters.");
        return;
      }
      if (passphraseVal !== confirmPassphraseVal) {
        setPassphraseError("Passphrases do not match.");
        return;
      }
      setPassphraseError("");
      data.passphrase = passphraseVal;
    } else {
      data.passphrase = null;
    }

    setIsSubmitting(true);
    try {
      // 1. Get presigned R2 upload URL
      const presignRes = await fetch(`/api/projects/${targetProjectId}/images/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });
      const presignJson = await presignRes.json();
      if (!presignJson.success) {
        throw new Error(presignJson.error?.message || "Failed to get presigned upload URL.");
      }

      const { uploadUrl, r2Key } = presignJson.data;

      // 2. Upload file bytes directly to R2
      setIsUploading(true);
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image file to R2 storage.");
      }

      setIsUploading(false);

      // 3. Confirm upload
      const confirmRes = await fetch(`/api/projects/${targetProjectId}/images/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          r2Key,
        }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmJson.success) {
        throw new Error(confirmJson.error?.message || "Failed to confirm upload.");
      }

      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast.success(`Image "${data.name}" uploaded successfully.`);
      handleOpenChange(false);
    } catch (err) {
      setIsUploading(false);
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEncrypt = () => {
    setEncryptEnabled(!encryptEnabled);
    setPassphraseVal("");
    setConfirmPassphraseVal("");
    setPassphraseError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Upload Image Asset</DialogTitle>
            <DialogDescription>
              Select an image file and configure category tags or access credentials.
            </DialogDescription>
          </DialogHeader>

          {/* Project Selection Dropdown (Global view only) */}
          {!projectId && (
            <Field>
              <FieldLabel className="text-xs font-semibold">Associated Project</FieldLabel>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-xs"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* File Picker Zone */}
          <Field>
            <FieldLabel className="text-xs font-semibold">Image File</FieldLabel>
            <div className="border-border bg-card/40 hover:bg-card/70 relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors">
              <Upload className="text-muted-foreground mb-1 h-6 w-6" />
              {fileName ? (
                <span className="text-foreground truncate font-mono text-xs font-medium">
                  {fileName}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">
                  Click to select PNG, JPG, WEBP or SVG
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          </Field>

          {/* Display Name */}
          <Field>
            <FieldLabel className="text-xs font-semibold">Display Title</FieldLabel>
            <Input {...register("name")} placeholder="System Architecture v1" className="h-9 text-xs" />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          {/* Category Dropdown */}
          <Field>
            <FieldLabel className="text-xs font-semibold">Category Tag</FieldLabel>
            <select
              {...register("category")}
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-xs"
            >
              <option value="mockup">Mockup</option>
              <option value="screenshot">Screenshot</option>
              <option value="architecture">Architecture</option>
              <option value="asset">Design Asset</option>
              <option value="other">Other</option>
            </select>
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel className="text-xs font-semibold">Description</FieldLabel>
            <Textarea
              {...register("description")}
              placeholder="Notes or context about this image asset..."
              className="h-16 text-xs"
            />
          </Field>

          {/* Encryption Option */}
          <div className="border-border/60 bg-muted/20 space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="text-primary h-4 w-4" />
                <span className="text-foreground text-xs font-medium">Client Encryption</span>
              </div>
              <Button
                type="button"
                variant={encryptEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleToggleEncrypt}
                className="h-7 text-[11px]"
              >
                {encryptEnabled ? "Enabled" : "Enable"}
              </Button>
            </div>

            {encryptEnabled && (
              <div className="space-y-2 pt-1">
                <Field>
                  <FieldLabel className="text-[11px] font-semibold">Passphrase</FieldLabel>
                  <Input
                    type="password"
                    value={passphraseVal}
                    onChange={(e) => setPassphraseVal(e.target.value)}
                    placeholder="Enter secret passphrase"
                    className="h-8 text-xs"
                  />
                </Field>

                <Field>
                  <FieldLabel className="text-[11px] font-semibold">Confirm Passphrase</FieldLabel>
                  <Input
                    type="password"
                    value={confirmPassphraseVal}
                    onChange={(e) => setConfirmPassphraseVal(e.target.value)}
                    placeholder="Repeat secret passphrase"
                    className="h-8 text-xs"
                  />
                </Field>

                {passphraseError && <FieldError>{passphraseError}</FieldError>}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="bg-[#4F46C7] hover:bg-[#4338a8] text-white text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isUploading ? "Uploading file..." : "Finalizing..."}
                </>
              ) : (
                "Upload Image"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
