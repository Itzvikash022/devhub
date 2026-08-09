"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { createTaskSchema, CreateTaskInput } from "@/schemas/task.schema";
import { useCreateTask, useUpdateTask, useAddComment, TaskData } from "@/hooks/useTasks";
import { useProjectDetails } from "@/hooks/useProjects";
import { useImagesList } from "@/hooks/useImages";
import { cn, getDisplayUrl } from "@/lib/utils";
import { Loader2, MessageSquare, Send, Upload, X, Check, Search, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewDialog } from "@/components/dialogs/ImagePreviewDialog";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: TaskData;
  defaultType?: "task" | "bug";
}

export function TaskDialog({ open, onOpenChange, projectId, task, defaultType }: TaskDialogProps) {
  const isEdit = !!task;
  const [commentText, setCommentText] = useState("");
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Screenshot preview dialog states
  const [screenshotPreviewSrc, setScreenshotPreviewSrc] = useState<string | null>(null);
  const [screenshotPreviewOpen, setScreenshotPreviewOpen] = useState(false);

  // Vault selector states
  const [vaultOpen, setVaultOpen] = useState(false);
  const [selectedVaultImages, setSelectedVaultImages] = useState<Set<string>>(new Set());
  const [vaultSearch, setVaultSearch] = useState("");
  const [r2Prefix, setR2Prefix] = useState("https://pub-placeholder.r2.dev");

  // Fetch project details for next bug number
  const { data: project } = useProjectDetails(projectId);

  // Fetch project images from vault
  const { data: vaultData } = useImagesList(projectId, { pageSize: 100 });

  // Mutations
  const { mutate: createTask, isPending: isCreatePending } = useCreateTask(projectId);
  const { mutate: updateTask, isPending: isUpdatePending } = useUpdateTask(projectId);
  const { mutate: addComment, isPending: isCommentPending } = useAddComment(
    projectId,
    task?._id || ""
  );

  const isPending = isCreatePending || isUpdatePending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema) as unknown as Resolver<CreateTaskInput>,
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
      type: defaultType || "task",
      area: "",
      screenshots: [],
    },
  });

  const taskType = watch("type");
  const screenshotsList = watch("screenshots") || [];

  // Reset form when task changes or dialog opens
  useEffect(() => {
    if (open) {
      if (task) {
        reset({
          title: task.title,
          description: task.description || "",
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          type: task.type || "task",
          area: task.area || "",
          screenshots: task.screenshots || [],
        });
      } else {
        reset({
          title: "",
          description: "",
          status: "todo",
          priority: "medium",
          dueDate: null,
          type: defaultType || "task",
          area: "",
          screenshots: [],
        });
      }
    }
  }, [open, task, defaultType, reset]);

  // Fetch dynamic R2 prefix
  useEffect(() => {
    if (open) {
      fetch("/api/r2-public-prefix")
        .then((res) => res.json())
        .then((data) => {
          if (data.prefix) {
            setR2Prefix(data.prefix);
          }
        })
        .catch((err) => console.error("Failed to load R2 public prefix:", err));
    }
  }, [open]);

  // Available vault images filter (only unencrypted matching search query)
  const availableVaultImages = useMemo(() => {
    if (!vaultData?.items) return [];
    return vaultData.items.filter((img) => {
      const isUnencrypted = !img.isEncrypted;
      const matchesSearch =
        img.name.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        img.fileName.toLowerCase().includes(vaultSearch.toLowerCase());
      return isUnencrypted && matchesSearch;
    });
  }, [vaultData, vaultSearch]);

  const onSubmit = (data: CreateTaskInput) => {
    if (isEdit && task) {
      updateTask(
        { id: task._id, data },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createTask(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const uploadFiles = async (files: FileList) => {
    setIsUploadingScreenshots(true);
    const uploadedUrls = [...screenshotsList];

    // Determine the bugNumber for folders
    const bugNumber = task?.bugNumber || (project?.bugCounter || 0) + 1;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image file.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 10MB size limit.`);
        continue;
      }

      try {
        // 1. Get presigned upload URL
        const presignRes = await fetch(`/api/projects/${projectId}/tasks/presign-screenshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            bugNumber,
          }),
        });

        const presignData = await presignRes.json();
        if (!presignData.success) {
          throw new Error(presignData.error?.message || "Failed to get presigned URL");
        }

        const { uploadUrl, publicUrl } = presignData.data;

        // 2. Upload file directly to R2
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file to storage.");
        }

        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(`Failed to upload "${file.name}".`);
      }
    }

    setValue("screenshots", uploadedUrls, { shouldDirty: true });
    setIsUploadingScreenshots(false);
  };

  const handleUploadScreenshots = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
    const next = screenshotsList.filter((_, idx) => idx !== indexToRemove);
    setValue("screenshots", next, { shouldDirty: true });
  };

  const handleAddSelectedVaultImages = () => {
    const urlsToAdd: string[] = [];
    selectedVaultImages.forEach((imgId) => {
      const imgObj = vaultData?.items.find((i) => i._id === imgId);
      if (imgObj) {
        const publicUrl = `${r2Prefix}/${imgObj.r2Key}`;
        urlsToAdd.push(publicUrl);
      }
    });

    if (urlsToAdd.length > 0) {
      setValue("screenshots", [...screenshotsList, ...urlsToAdd], { shouldDirty: true });
      toast.success(`Added ${urlsToAdd.length} image(s) from vault.`);
    }

    setVaultOpen(false);
    setSelectedVaultImages(new Set());
    setVaultSearch("");
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment(
      { text: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText("");
        },
      }
    );
  };

  const formatInputDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCommentText("");
    }
    onOpenChange(isOpen);
  };

  const onDragOverHandler = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeaveHandler = () => {
    setIsDragOver(false);
  };

  const onDropHandler = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "max-h-[98vh] overflow-y-auto transition-all p-6",
            isEdit && task ? "sm:max-w-5xl" : "sm:max-w-xl"
          )}
        >
          {isEdit && task ? (
            /* 2-Section Layout for Editing Task/Bug (Taller layout) */
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:h-[660px]">
              {/* Left Section: Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col justify-between h-full md:pr-6 md:border-r md:border-border min-w-0">
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
                  <DialogHeader className="space-y-0.5">
                    <DialogTitle className="text-base">
                      {taskType === "bug"
                        ? `Bug Details (B-${String(task.bugNumber || 0).padStart(4, "0")})`
                        : `Task Details (T-${String(task.bugNumber || 0).padStart(4, "0")})`}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Update details, status, priority, or other elements.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 pt-1">
                    <div className="md:col-span-2">
                      <Field data-invalid={!!errors.title}>
                        <FieldLabel htmlFor="title" className="text-xs">Title</FieldLabel>
                        <Input
                          id="title"
                          type="text"
                          placeholder="e.g. Build authentication route"
                          disabled={isPending}
                          className="h-9 text-xs"
                          {...register("title")}
                        />
                        {errors.title?.message && <FieldError>{errors.title.message}</FieldError>}
                      </Field>
                    </div>

                    <div className="md:col-span-2">
                      <Field data-invalid={!!errors.description}>
                        <FieldLabel htmlFor="description" className="text-xs">Description</FieldLabel>
                        <Textarea
                          id="description"
                          placeholder={taskType === "bug" ? "Describe the bug, and provide steps to reproduce..." : "Describe goals, specifications, or details..."}
                          disabled={isPending}
                          className="h-24 resize-none break-all break-words text-xs"
                          {...register("description")}
                        />
                        {errors.description?.message && (
                          <FieldError>{errors.description.message}</FieldError>
                        )}
                      </Field>
                    </div>

                    <div>
                      <Field data-invalid={!!errors.status}>
                        <FieldLabel htmlFor="status" className="text-xs">Status</FieldLabel>
                        <select
                          id="status"
                          disabled={isPending}
                          {...register("status")}
                          className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-2.5 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="todo">Todo</option>
                          <option value="in-progress">In Progress</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </select>
                        {errors.status?.message && <FieldError>{errors.status.message}</FieldError>}
                      </Field>
                    </div>

                    <div>
                      <Field data-invalid={!!errors.priority}>
                        <FieldLabel htmlFor="priority" className="text-xs">Priority</FieldLabel>
                        <select
                          id="priority"
                          disabled={isPending}
                          {...register("priority")}
                          className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-2.5 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        {errors.priority?.message && <FieldError>{errors.priority.message}</FieldError>}
                      </Field>
                    </div>

                    <div className="md:col-span-2">
                      <Field data-invalid={!!errors.dueDate}>
                        <FieldLabel htmlFor="dueDate" className="text-xs">Due Date</FieldLabel>
                        <Input
                          id="dueDate"
                          type="date"
                          disabled={isPending}
                          className="h-9 text-xs"
                          defaultValue={task?.dueDate ? formatInputDate(task.dueDate) : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setValue("dueDate", val ? new Date(val) : null, { shouldDirty: true });
                          }}
                        />
                        {errors.dueDate?.message && <FieldError>{errors.dueDate.message}</FieldError>}
                      </Field>
                    </div>

                    <div className="md:col-span-2">
                      <Field data-invalid={!!errors.area}>
                        <FieldLabel htmlFor="area" className="text-xs">Area / Module</FieldLabel>
                        <Input
                          id="area"
                          type="text"
                          placeholder="e.g. Authentication, Billing, Header..."
                          disabled={isPending}
                          className="h-9 text-xs"
                          {...register("area")}
                        />
                        {errors.area?.message && <FieldError>{errors.area.message}</FieldError>}
                      </Field>
                    </div>

                    {/* Screenshot Upload Panel */}
                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FieldLabel className="text-xs">Screenshots</FieldLabel>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVaultImages(new Set());
                            setVaultSearch("");
                            setVaultOpen(true);
                          }}
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-background hover:bg-muted font-medium text-[9px] transition-colors"
                        >
                          <ImageIcon className="h-2.5 w-2.5 text-[#4F46C7]" />
                          Select from Vault
                        </button>
                      </div>
                      <div
                        onDragOver={onDragOverHandler}
                        onDragLeave={onDragLeaveHandler}
                        onDrop={onDropHandler}
                        className={cn(
                          "text-[10px] text-muted-foreground bg-muted/20 border border-dashed rounded-lg p-3 text-center transition-colors duration-150",
                          isDragOver ? "border-[#4F46C7] bg-[#4F46C7]/5" : "border-border"
                        )}
                      >
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          id="screenshot-upload-edit"
                          className="hidden"
                          onChange={handleUploadScreenshots}
                          disabled={isUploadingScreenshots || isPending}
                        />
                        <label
                          htmlFor="screenshot-upload-edit"
                          className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-background hover:bg-muted font-medium text-[10px] transition-colors"
                        >
                          {isUploadingScreenshots ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3" />
                              Upload Screenshots
                            </>
                          )}
                        </label>
                        <p className="mt-1 text-[9px]">
                          Drag and drop images, or click to browse.
                        </p>
                        <p className="mt-0.5 text-[8px] text-[#4F46C7] font-semibold">
                          Screenshots are deleted 30 days after bug is closed.
                        </p>
                      </div>

                      {/* List previews */}
                      {screenshotsList.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-1.5">
                          {screenshotsList.map((url, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                setScreenshotPreviewSrc(url);
                                setScreenshotPreviewOpen(true);
                              }}
                              className="relative group aspect-video border rounded overflow-hidden bg-muted cursor-pointer"
                            >
                              <img src={getDisplayUrl(url)} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveScreenshot(index);
                                }}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons aligned at the bottom */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border mt-auto shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </form>

              {/* Right Section: Comments (Flex column aligned to full dialog height) */}
              <div className="flex flex-col h-full md:pl-6 min-w-0 pt-4 md:pt-0">
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="text-muted-foreground h-4 w-4" />
                    <h3 className="text-foreground text-sm font-semibold">
                      Comments <span className="text-muted-foreground font-normal">({task.comments.length})</span>
                    </h3>
                  </div>

                  {/* Stretches to fill vertical space perfectly */}
                  <ScrollArea className="border-border bg-muted/10 flex-1 rounded-md border p-3 min-h-0">
                    {task.comments.length === 0 ? (
                      <div className="flex h-full min-h-[180px] items-center justify-center p-4 text-center">
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          No comments yet. Write a comment below to start.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {task.comments.map((comment, index) => (
                          <div key={index} className="space-y-1">
                            <p className="text-foreground bg-background border-border rounded border p-2.5 text-xs leading-relaxed break-all break-words">
                              {comment.text}
                            </p>
                            <span className="text-muted-foreground block text-right font-mono text-[10px]">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Aligned exactly at the bottom with form submit buttons */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-3 border-t border-border mt-4 shrink-0">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Type a comment..."
                    disabled={isCommentPending}
                    className="flex-1 text-xs h-9"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCommentPending || !commentText.trim()}
                    className="shrink-0 h-9"
                    title="Send comment"
                  >
                    {isCommentPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            /* Single Column Layout for New Task/Bug Creation */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{taskType === "bug" ? "New Bug" : "New Task"}</DialogTitle>
                <DialogDescription>
                  Create a new project {taskType === "bug" ? "bug" : "task"} to trace progress.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field data-invalid={!!errors.title}>
                    <FieldLabel htmlFor="title">Title</FieldLabel>
                    <Input
                      id="title"
                      type="text"
                      placeholder={taskType === "bug" ? "e.g. Broken links in footer" : "e.g. Build authentication route"}
                      disabled={isPending}
                      {...register("title")}
                    />
                    {errors.title?.message && <FieldError>{errors.title.message}</FieldError>}
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      placeholder={taskType === "bug" ? "Describe the bug, and provide steps to reproduce..." : "Describe details, goals, or specifications..."}
                      disabled={isPending}
                      className="h-20 resize-none break-all break-words"
                      {...register("description")}
                    />
                    {errors.description?.message && (
                      <FieldError>{errors.description.message}</FieldError>
                    )}
                  </Field>
                </div>

                <div>
                  <Field data-invalid={!!errors.status}>
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <select
                      id="status"
                      disabled={isPending}
                      {...register("status")}
                      className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="todo">Todo</option>
                      <option value="in-progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>
                    {errors.status?.message && <FieldError>{errors.status.message}</FieldError>}
                  </Field>
                </div>

                <div>
                  <Field data-invalid={!!errors.priority}>
                    <FieldLabel htmlFor="priority">Priority</FieldLabel>
                    <select
                      id="priority"
                      disabled={isPending}
                      {...register("priority")}
                      className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    {errors.priority?.message && <FieldError>{errors.priority.message}</FieldError>}
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field data-invalid={!!errors.dueDate}>
                    <FieldLabel htmlFor="dueDate">Due Date</FieldLabel>
                    <Input
                      id="dueDate"
                      type="date"
                      disabled={isPending}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue("dueDate", val ? new Date(val) : null, { shouldDirty: true });
                      }}
                    />
                    {errors.dueDate?.message && <FieldError>{errors.dueDate.message}</FieldError>}
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field data-invalid={!!errors.area}>
                    <FieldLabel htmlFor="area">Area / Module</FieldLabel>
                    <Input
                      id="area"
                      type="text"
                      placeholder="e.g. Authentication, Billing, Header..."
                      disabled={isPending}
                      {...register("area")}
                    />
                    {errors.area?.message && <FieldError>{errors.area.message}</FieldError>}
                  </Field>
                </div>

                {/* Screenshot Upload Panel */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Screenshots</FieldLabel>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVaultImages(new Set());
                        setVaultSearch("");
                        setVaultOpen(true);
                      }}
                      className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-background hover:bg-muted font-medium text-[10px] transition-colors"
                    >
                      <ImageIcon className="h-3 w-3 text-[#4F46C7]" />
                      Select from Vault
                    </button>
                  </div>
                  <div
                    onDragOver={onDragOverHandler}
                    onDragLeave={onDragLeaveHandler}
                    onDrop={onDropHandler}
                    className={cn(
                      "text-[11px] text-muted-foreground bg-muted/20 border border-dashed rounded-lg p-4 text-center transition-colors duration-150",
                      isDragOver ? "border-[#4F46C7] bg-[#4F46C7]/5" : "border-border"
                    )}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="screenshot-upload-new"
                      className="hidden"
                      onChange={handleUploadScreenshots}
                      disabled={isUploadingScreenshots || isPending}
                    />
                    <label
                      htmlFor="screenshot-upload-new"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-background hover:bg-muted font-medium transition-colors"
                    >
                      {isUploadingScreenshots ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3" />
                          Upload Screenshots
                        </>
                      )}
                    </label>
                    <p className="mt-1 text-[10px]">
                      Drag and drop images, or click to browse.
                    </p>
                    <p className="mt-1 text-[9px] text-[#4F46C7] font-semibold">
                      Screenshots are deleted 30 days after bug is closed.
                    </p>
                  </div>

                  {/* Previews */}
                  {screenshotsList.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {screenshotsList.map((url, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setScreenshotPreviewSrc(url);
                            setScreenshotPreviewOpen(true);
                          }}
                          className="relative group aspect-video border rounded overflow-hidden bg-muted cursor-pointer"
                        >
                          <img src={getDisplayUrl(url)} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScreenshot(index);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2">
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
                      Creating...
                    </>
                  ) : (
                    `Create ${taskType === "bug" ? "bug" : "task"}`
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Select from Image Vault Dialog Overlay */}
      <Dialog open={vaultOpen} onOpenChange={setVaultOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <div className="flex flex-col max-h-[85vh] p-6">
            <DialogHeader className="shrink-0 mb-4">
              <DialogTitle className="text-sm font-semibold text-foreground">Select from Image Vault</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select one or more unencrypted images pre-uploaded in this project's Image Vault.
              </DialogDescription>
            </DialogHeader>

            {/* Search Bar */}
            <div className="relative mb-4 shrink-0">
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground animate-pulse" />
              <Input
                placeholder="Search images by name..."
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/20 border-border"
              />
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/10 min-h-[200px] max-h-[450px]">
              {availableVaultImages.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-4 text-center">
                  <span className="text-muted-foreground text-xs italic">
                    {vaultData?.items?.length ? "No matching unencrypted images found." : "No images available in project vault."}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableVaultImages.map((image) => {
                    const isSelected = selectedVaultImages.has(image._id);
                    return (
                      <div
                        key={image._id}
                        onClick={() => {
                          const next = new Set(selectedVaultImages);
                          if (next.has(image._id)) {
                            next.delete(image._id);
                          } else {
                            next.add(image._id);
                          }
                          setSelectedVaultImages(next);
                        }}
                        className={cn(
                          "group relative aspect-video border rounded-md overflow-hidden bg-muted cursor-pointer transition-all duration-150 select-none",
                          isSelected
                            ? "border-[#4F46C7] ring-2 ring-[#4F46C7]/50 scale-[0.98]"
                            : "border-border hover:border-muted-foreground/45"
                        )}
                      >
                        {/* Image Thumbnail */}
                        <img
                          src={getDisplayUrl(image.thumbnail || "")}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Name Overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/75 p-1 text-[9px] text-white truncate font-sans">
                          {image.name}
                        </div>

                        {/* Selected Checkmark Indicator */}
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-[#4F46C7] text-white rounded-full p-0.5 shadow-md">
                            <Check className="h-3 w-3 font-bold" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-border mt-4 shrink-0 flex flex-row items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {selectedVaultImages.size} image(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVaultOpen(false);
                    setSelectedVaultImages(new Set());
                  }}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSelectedVaultImages}
                  disabled={selectedVaultImages.size === 0}
                  className="h-8 text-xs bg-[#4F46C7] hover:bg-[#4F46C7]/90 text-white cursor-pointer"
                >
                  Add Selected
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ImagePreviewDialog
        open={screenshotPreviewOpen}
        onOpenChange={setScreenshotPreviewOpen}
        src={getDisplayUrl(screenshotPreviewSrc || "")}
        name="Screenshot Preview"
      />
    </>
  );
}
