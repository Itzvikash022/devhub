"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { usePresignImage, useConfirmImage } from "@/hooks/useImages";
import { Loader2, Upload, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MAX_IMAGE_SIZE } from "@/constants/app.constants";

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ImageUploadDialog({ open, onOpenChange, projectId }: ImageUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [passphraseVal, setPassphraseVal] = useState("");
  const [confirmPassphraseVal, setConfirmPassphraseVal] = useState("");
  const [passphraseError, setPassphraseError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: presignImage, isPending: isPendingPresign } = usePresignImage(projectId);
  const { mutateAsync: confirmImage, isPending: isPendingConfirm } = useConfirmImage(projectId);

  const isPending = isPendingPresign || isUploading || isPendingConfirm;

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

    // Auto-fill Name field with the clean base name of file
    const cleanName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    setValue("name", cleanName);
    setValue("fileName", file.name);
    setValue("fileType", file.type);
    setValue("fileSize", file.size);
  };

  const onSubmit = async (data: ConfirmImageAssetInput) => {
    if (!selectedFile) {
      toast.error("Please select an image file to upload.");
      return;
    }

    if (encryptEnabled) {
      if (!passphraseVal || passphraseVal.length < 4) {
        setPassphraseError("Passphrase must be at least 4 characters long.");
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

    try {
      // 1. Get presigned R2 upload URL
      const { uploadUrl, r2Key } = await presignImage({
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });

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
      await confirmImage({
        ...data,
        r2Key,
      });

      handleOpenChange(false);
    } catch (err) {
      setIsUploading(false);
      toast.error(err instanceof Error ? err.message : "Upload failed.");
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

          <div className="space-y-4 py-1">
            {/* Custom file dropzone/uploader */}
            <div className="border-border hover:border-primary/60 bg-muted/5 group relative cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors">
              <input
                type="file"
                accept="image/*"
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
                    <span>Click or drag image file here (Max 10MB)</span>
                  )}
                </div>
              </div>
            </div>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Clean Image Label</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Landing Page Staging Layout"
                disabled={isPending}
                {...register("name")}
              />
              {errors.name?.message && <FieldError>{errors.name.message}</FieldError>}
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
                  <option value="mockup">Mockup</option>
                  <option value="screenshot">Screenshot</option>
                  <option value="architecture">Architecture</option>
                  <option value="asset">UI Asset</option>
                  <option value="other">Other</option>
                </select>
                {errors.category?.message && <FieldError>{errors.category.message}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.expiryDate}>
                <FieldLabel htmlFor="expiryDate">Expiry Date (Optional)</FieldLabel>
                <Input
                  id="expiryDate"
                  type="date"
                  disabled={isPending}
                  {...register("expiryDate")}
                />
                {errors.expiryDate?.message && <FieldError>{errors.expiryDate.message}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Short description of the schema or mockup contents..."
                disabled={isPending}
                className="h-16 resize-none text-xs"
                {...register("description")}
              />
              {errors.description?.message && <FieldError>{errors.description.message}</FieldError>}
            </Field>

            {/* AES Passphrase toggle and entry fields */}
            <div className="bg-muted/15 border-border/60 space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="text-primary h-4 w-4" />
                  <div className="text-left">
                    <p className="text-foreground text-xs font-semibold">Passphrase Encryption</p>
                    <p className="text-muted-foreground text-[10px]">
                      Locks access with a custom key
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEncrypt}
                  disabled={isPending}
                  className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                    encryptEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                      encryptEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {encryptEnabled && (
                <div className="border-border/40 animate-in fade-in slide-in-from-top-1 space-y-2 border-t pt-2 duration-200">
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="text-muted-foreground mb-1 block text-[10px] font-medium">
                        AES Passphrase
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passphraseVal}
                        onChange={(e) => setPassphraseVal(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 block text-[10px] font-medium">
                        Confirm Passphrase
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassphraseVal}
                        onChange={(e) => setConfirmPassphraseVal(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  {passphraseError && (
                    <p className="text-destructive font-mono text-[10px] font-medium">
                      {passphraseError}
                    </p>
                  )}
                  <p className="text-muted-foreground flex items-start gap-1 font-sans text-[9px] leading-snug">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                    <span>
                      Passphrases are transiently processed during upload/decryption and are never
                      stored in the database.
                    </span>
                  </p>
                </div>
              )}
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
            <Button type="submit" disabled={isPending || !selectedFile}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
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
