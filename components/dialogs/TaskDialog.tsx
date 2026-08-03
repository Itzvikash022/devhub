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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createTaskSchema, CreateTaskInput } from "@/schemas/task.schema";
import { useCreateTask, useUpdateTask, useAddComment, TaskData } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare, Send } from "lucide-react";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: TaskData;
}

export function TaskDialog({ open, onOpenChange, projectId, task }: TaskDialogProps) {
  const isEdit = !!task;
  const [commentText, setCommentText] = useState("");

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
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema) as unknown as Resolver<CreateTaskInput>,
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
    },
  });

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
        });
      } else {
        reset({
          title: "",
          description: "",
          status: "todo",
          priority: "medium",
          dueDate: null,
        });
      }
    }
  }, [open, task, reset]);

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[90vh] overflow-y-auto transition-all",
          isEdit && task ? "sm:max-w-4xl" : "sm:max-w-xl"
        )}
      >
        {isEdit && task ? (
          /* 2-Section Layout for Editing Task */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left Section: Task Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col justify-between space-y-4 md:pr-6 md:border-r md:border-border min-w-0">
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Task Details</DialogTitle>
                  <DialogDescription>
                    Update task status, priority, or other elements.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field data-invalid={!!errors.title}>
                      <FieldLabel htmlFor="title">Task Title</FieldLabel>
                      <Input
                        id="title"
                        type="text"
                        placeholder="e.g. Build authentication route"
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
                        placeholder="Describe task details, goals, or specifications..."
                        disabled={isPending}
                        className="h-24 resize-none break-all break-words"
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

                  <div>
                    <Field data-invalid={!!errors.dueDate}>
                      <FieldLabel htmlFor="dueDate">Due Date</FieldLabel>
                      <Input
                        id="dueDate"
                        type="date"
                        disabled={isPending}
                        defaultValue={task?.dueDate ? formatInputDate(task.dueDate) : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          reset((prev) => ({
                            ...prev,
                            dueDate: val ? new Date(val) : null,
                          }));
                        }}
                      />
                      {errors.dueDate?.message && <FieldError>{errors.dueDate.message}</FieldError>}
                    </Field>
                  </div>

                </div>
              </div>

              {/* Clean Left Section Footer without negative margins */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-auto">
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
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </form>

            {/* Right Section: Comments */}
            <div className="flex flex-col justify-between space-y-4 md:pl-6 min-w-0 pt-4 md:pt-0">
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-muted-foreground h-4 w-4" />
                  <h3 className="text-foreground text-sm font-semibold">
                    Comments <span className="text-muted-foreground font-normal">({task.comments.length})</span>
                  </h3>
                </div>

                <ScrollArea className="border-border bg-muted/10 flex-1 min-h-[220px] max-h-[320px] rounded-md border p-3">
                  {task.comments.length === 0 ? (
                    <div className="flex h-full min-h-[180px] items-center justify-center p-4 text-center">
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        No comments yet. Write a note below to start the discussion.
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

              <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Type a comment..."
                  disabled={isCommentPending}
                  className="flex-1 text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCommentPending || !commentText.trim()}
                  className="shrink-0"
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
          /* Single Column Layout for New Task Creation */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
              <DialogDescription>
                Create a new project task to trace progress.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field data-invalid={!!errors.title}>
                  <FieldLabel htmlFor="title">Task Title</FieldLabel>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g. Build authentication route"
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
                    placeholder="Describe task details, goals, or specifications..."
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

              <div>
                <Field data-invalid={!!errors.dueDate}>
                  <FieldLabel htmlFor="dueDate">Due Date</FieldLabel>
                  <Input
                    id="dueDate"
                    type="date"
                    disabled={isPending}
                    onChange={(e) => {
                      const val = e.target.value;
                      reset((prev) => ({
                        ...prev,
                        dueDate: val ? new Date(val) : null,
                      }));
                    }}
                  />
                  {errors.dueDate?.message && <FieldError>{errors.dueDate.message}</FieldError>}
                </Field>
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
                  "Create task"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

