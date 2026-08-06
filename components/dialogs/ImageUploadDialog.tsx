"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjectsList } from "@/hooks/useProjects";
import { usePresignImageBatch, useConfirmImageBatch } from "@/hooks/useImages";
import { generateThumbnailAndDimensions } from "@/lib/image-helpers";
import { Loader2, Upload, Lock, Trash2, X, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { MAX_IMAGE_SIZE } from "@/constants/app.constants";

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

interface QueueItem {
  id: string;
  file: File;
  name: string;
  category: "mockup" | "screenshot" | "architecture" | "asset" | "other";
  description: string;
  progress: number;
  status: "queued" | "uploading" | "completed" | "failed" | "cancelled";
  errorMsg?: string;
  uploadUrl?: string;
  r2Key?: string;
  width?: number | null;
  height?: number | null;
  thumbnail?: string | null;
}

export function ImageUploadDialog({ open, onOpenChange, projectId }: ImageUploadDialogProps) {
  const { data: projects = [] } = useProjectsList();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  // Advanced Encryption Options
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [passphraseVal, setPassphraseVal] = useState("");
  const [confirmPassphraseVal, setConfirmPassphraseVal] = useState("");
  const [passphraseError, setPassphraseError] = useState("");

  const targetProjectId = projectId || selectedProjectId;

  // Track active XMLHttpRequest objects for aborting
  const activeXhrs = useRef<{ [itemId: string]: XMLHttpRequest }>({});
  // Track queue state in a ref to avoid closures in async callbacks
  const queueRef = useRef<QueueItem[]>([]);
  queueRef.current = queue;

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projectId, projects, selectedProjectId]);

  const { mutateAsync: presignBatch } = usePresignImageBatch(targetProjectId);
  const { mutateAsync: confirmBatch } = useConfirmImageBatch(targetProjectId);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Abort all active uploads
      Object.values(activeXhrs.current).forEach((xhr) => xhr.abort());
      activeXhrs.current = {};
      setQueue([]);
      setIsUploading(false);
      setEncryptEnabled(false);
      setPassphraseVal("");
      setConfirmPassphraseVal("");
      setPassphraseError("");
      setAdvancedOpen(false);
    }
    onOpenChange(isOpen);
  };

  const addFilesToQueue = (files: FileList) => {
    const itemsToAdd: QueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image file.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`"${file.name}" exceeds the ${MAX_IMAGE_SIZE / (1024 * 1024)}MB size limit.`);
        continue;
      }

      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      itemsToAdd.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: baseName,
        category: "mockup",
        description: "",
        progress: 0,
        status: "queued",
      });
    }

    setQueue((prev) => [...prev, ...itemsToAdd]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToQueue(e.target.files);
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const updateItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    const xhr = activeXhrs.current[id];
    if (xhr) {
      xhr.abort();
      delete activeXhrs.current[id];
    }
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const cancelUpload = (id: string) => {
    const xhr = activeXhrs.current[id];
    if (xhr) {
      xhr.abort();
      delete activeXhrs.current[id];
    }
    updateItem(id, { status: "cancelled", progress: 0 });
  };

  const retryUpload = (id: string) => {
    updateItem(id, { status: "queued", progress: 0, errorMsg: undefined });
  };

  const startBatchUpload = async () => {
    if (!targetProjectId) {
      toast.error("Please select a project.");
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
    }

    const itemsToUpload = queue.filter((item) => item.status === "queued" || item.status === "failed");
    if (itemsToUpload.length === 0) {
      toast.error("No queued files to upload.");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Get presigned URLs for all batch files
      const presignResponse = await presignBatch({
        files: itemsToUpload.map((item) => ({
          fileName: item.file.name,
          fileType: item.file.type,
        })),
      });

      // Map presign URLs back to items
      const updatedItems = itemsToUpload.map((item, index) => {
        const presignItem = presignResponse[index];
        return {
          ...item,
          uploadUrl: presignItem.uploadUrl,
          r2Key: presignItem.r2Key,
        };
      });

      // Update queue state with R2 URLs and Keys
      setQueue((prev) =>
        prev.map((item) => {
          const match = updatedItems.find((u) => u.id === item.id);
          return match ? match : item;
        })
      );

      // Concurrency settings
      const MAX_CONCURRENT = 3;
      let activeCount = 0;
      const todo = [...updatedItems];

      const runNext = async () => {
        if (todo.length === 0 && activeCount === 0) {
          // All done! Run confirmation step
          await finalizeConfirmation();
          return;
        }

        while (activeCount < MAX_CONCURRENT && todo.length > 0) {
          const item = todo.shift()!;
          activeCount++;
          uploadSingleItem(item)
            .catch((err) => {
              console.error("Item upload failure:", err);
            })
            .finally(() => {
              activeCount--;
              runNext();
            });
        }
      };

      // Start initial pool
      runNext();
    } catch (err) {
      toast.error("Failed to generate presigned URLs.");
      setIsUploading(false);
    }
  };

  const uploadSingleItem = async (item: QueueItem): Promise<void> => {
    updateItem(item.id, { status: "uploading", progress: 0 });

    try {
      // Generate Client-Side Thumbnail & Dimensions
      const { thumbnail, width, height } = await generateThumbnailAndDimensions(item.file);

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", item.uploadUrl!);
        xhr.setRequestHeader("Content-Type", item.file.type);

        activeXhrs.current[item.id] = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateItem(item.id, { progress: percent });
          }
        };

        xhr.onload = () => {
          delete activeXhrs.current[item.id];
          if (xhr.status === 200 || xhr.status === 201 || xhr.status === 204) {
            updateItem(item.id, {
              status: "completed",
              progress: 100,
              thumbnail,
              width,
              height,
            });
            resolve();
          } else {
            updateItem(item.id, { status: "failed", errorMsg: "Upload failed" });
            reject(new Error("R2 upload status error"));
          }
        };

        xhr.onerror = () => {
          delete activeXhrs.current[item.id];
          updateItem(item.id, { status: "failed", errorMsg: "Network error" });
          reject(new Error("XHR network error"));
        };

        xhr.send(item.file);
      });
    } catch (err) {
      updateItem(item.id, { status: "failed", errorMsg: "Thumbnail gen failed" });
    }
  };

  const finalizeConfirmation = async () => {
    // Read the latest state from ref to avoid closures
    const latestQueue = queueRef.current;
    const completed = latestQueue.filter((item) => item.status === "completed" && item.r2Key);

    if (completed.length === 0) {
      toast.error("No files successfully uploaded to R2.");
      setIsUploading(false);
      return;
    }

    try {
      const confirmItems = completed.map((item) => ({
        r2Key: item.r2Key!,
        name: item.name,
        category: item.category,
        description: item.description,
        expiryDate: null,
        passphrase: encryptEnabled && passphraseVal ? passphraseVal : null,
        fileName: item.file.name,
        fileType: item.file.type,
        fileSize: item.file.size,
        width: item.width || null,
        height: item.height || null,
        thumbnail: item.thumbnail || null,
        originalKey: item.r2Key || null,
        thumbnailKey: null,
      }));

      await confirmBatch({ items: confirmItems });

      toast.success(`Successfully uploaded and saved ${completed.length} images.`);
      handleOpenChange(false);
    } catch (err) {
      toast.error("Failed to register images in database.");
      // Mark those completed items back to failed
      completed.forEach((item) => {
        updateItem(item.id, { status: "failed", errorMsg: "DB Save Failed" });
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Calculations for overall progress bar
  const totalFiles = queue.length;
  const completedFiles = queue.filter((item) => item.status === "completed").length;
  const overallProgress =
    totalFiles > 0
      ? Math.round(
          queue.reduce((acc, item) => acc + (item.progress || 0), 0) / totalFiles
        )
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Images</DialogTitle>
          <DialogDescription>
            Drag and drop designs, screenshots, or code diagrams to upload them in parallel batches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-left">
          {/* Associated Project (Global only) */}
          {!projectId && (
            <Field>
              <FieldLabel className="text-xs font-semibold">Associated Project</FieldLabel>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={isUploading}
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

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-border bg-card/40 hover:bg-card/70 relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : ""
            }`}
          >
            <Upload className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-foreground text-xs font-medium">
              Drag & drop images here, or browse files
            </p>
            <p className="text-muted-foreground text-[10px] mt-1">
              Supports PNG, JPG, WEBP, and GIF (Max 10MB per file)
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isUploading}
              onChange={handleFileChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>

          {/* Upload Queue Manager */}
          {queue.length > 0 && (
            <div className="border-border rounded-lg border bg-card/10 overflow-hidden">
              <div className="bg-muted/20 border-b border-border px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Queue ({completedFiles}/{totalFiles} Completed)
                </span>
                {queue.some((i) => i.status === "failed") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      queue.forEach((item) => {
                        if (item.status === "failed") retryUpload(item.id);
                      });
                    }}
                    className="h-6 text-[10px] text-primary gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Retry Failed
                  </Button>
                )}
              </div>

              {/* Individual queue rows */}
              <div className="max-h-[30vh] overflow-y-auto divide-y divide-border/60">
                {queue.map((item) => (
                  <div key={item.id} className="p-3 flex flex-col gap-2 bg-card/5">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Input for customization & meta */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                            placeholder="File name"
                            disabled={isUploading}
                            className="h-7 text-xs font-semibold px-2"
                          />
                          <select
                            value={item.category}
                            onChange={(e) =>
                              updateItem(item.id, {
                                category: e.target.value as QueueItem["category"],
                              })
                            }
                            disabled={isUploading}
                            className="border-input bg-background text-foreground h-7 rounded border px-2 text-[10px]"
                          >
                            <option value="mockup">Mockup</option>
                            <option value="screenshot">Screenshot</option>
                            <option value="architecture">Architecture</option>
                            <option value="asset">Asset</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Add description (optional)"
                          disabled={isUploading}
                          className="h-6 text-[10px] px-2 text-muted-foreground"
                        />
                      </div>

                      {/* Right: Actions / Status */}
                      <div className="flex items-center gap-2 text-xs shrink-0 self-center">
                        {item.status === "uploading" && (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-[10px] font-semibold">{item.progress}%</span>
                          </div>
                        )}
                        {item.status === "completed" && (
                          <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
                            Done
                          </span>
                        )}
                        {item.status === "failed" && (
                          <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
                            Failed
                          </span>
                        )}
                        {item.status === "cancelled" && (
                          <span className="text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
                            Cancelled
                          </span>
                        )}

                        <div className="flex gap-1">
                          {item.status === "uploading" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => cancelUpload(item.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          {item.status === "failed" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => retryUpload(item.id)}
                              className="h-6 w-6 text-primary"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                          {!isUploading && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="h-6 w-6 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress slider */}
                    {item.status === "uploading" && (
                      <div className="w-full bg-muted rounded-full h-1">
                        <div
                          className="bg-primary h-1 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Overall Progress Footer */}
              {isUploading && (
                <div className="bg-muted/10 border-t border-border p-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span>Overall Upload Progress</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advanced Encryption Panel */}
          <div className="border border-border/60 rounded-lg overflow-hidden bg-card/20">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted/15 focus:outline-none"
            >
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Advanced Security Options</span>
              </div>
              {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {advancedOpen && (
              <div className="p-3 border-t border-border/60 space-y-3 bg-card/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">Server-Assisted Encryption</span>
                    <span className="text-[10px] text-muted-foreground">Encrypt image assets on R2 with a passphrase.</span>
                  </div>
                  <Button
                    type="button"
                    variant={encryptEnabled ? "default" : "outline"}
                    size="sm"
                    disabled={isUploading}
                    onClick={() => {
                      setEncryptEnabled(!encryptEnabled);
                      setPassphraseVal("");
                      setConfirmPassphraseVal("");
                      setPassphraseError("");
                    }}
                    className="h-7 text-[10px]"
                  >
                    {encryptEnabled ? "Enabled" : "Enable"}
                  </Button>
                </div>

                {encryptEnabled && (
                  <div className="space-y-2 pt-1 border-t border-dashed border-border/60">
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <span className="text-[10px] font-semibold text-muted-foreground mb-1 block">Passphrase</span>
                        <Input
                          type="password"
                          value={passphraseVal}
                          onChange={(e) => setPassphraseVal(e.target.value)}
                          placeholder="Enter secret passphrase"
                          disabled={isUploading}
                          className="h-8 text-xs"
                        />
                      </Field>
                      <Field>
                        <span className="text-[10px] font-semibold text-muted-foreground mb-1 block">Confirm Passphrase</span>
                        <Input
                          type="password"
                          value={confirmPassphraseVal}
                          onChange={(e) => setConfirmPassphraseVal(e.target.value)}
                          placeholder="Confirm passphrase"
                          disabled={isUploading}
                          className="h-8 text-xs"
                        />
                      </Field>
                    </div>
                    {passphraseError && (
                      <p className="text-[10px] text-red-500 font-semibold">{passphraseError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
            className="text-xs h-9"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={startBatchUpload}
            disabled={isUploading || queue.length === 0}
            className="bg-[#4F46C7] hover:bg-[#4338a8] text-white text-xs gap-1.5 h-9"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading Batch...
              </>
            ) : (
              `Start Upload (${queue.filter((i) => i.status === "queued" || i.status === "failed").length} files)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
