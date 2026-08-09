"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateTaskInput, UpdateTaskInput, CreateCommentInput } from "@/schemas/task.schema";
import { API_ROUTES } from "@/constants/routes.constants";
import type { ApiResponse } from "@/types";

export interface CommentData {
  _id?: string;
  userName?: string;
  text: string;
  createdBy?: any;
  createdAt: string;
}

export interface TaskData {
  _id: string;
  projectId: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "blocked" | "ready-for-test" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  comments: CommentData[];
  type?: "task" | "bug";
  bugNumber?: number | null;
  area?: string | null;
  screenshots?: string[];
  closedAt?: string | null;
  createdBy?: any;
  assignedTo?: any;
  createdAt: string;
  updatedAt: string;
}

class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message);
  }
  return json.data;
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useTasksList(projectId: string) {
  return useQuery<TaskData[], ApiError>({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.PROJECT_TASKS(projectId));
      return handleResponse<TaskData[]>(res);
    },
    enabled: !!projectId,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<TaskData, ApiError, CreateTaskInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.PROJECT_TASKS(projectId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<TaskData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`Task "${data.title}" created.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create task.");
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<TaskData, ApiError, { id: string; data: UpdateTaskInput }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(API_ROUTES.TASK(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<TaskData>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update task.");
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await fetch(API_ROUTES.TASK(id), {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Task deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete task.");
    },
  });
}

export function useAddComment(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<TaskData, ApiError, CreateCommentInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_ROUTES.TASK(taskId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<TaskData>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Comment added.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add comment.");
    },
  });
}
