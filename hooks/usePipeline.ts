"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreatePipelineItemInput, UpdatePipelineItemInput } from "@/schemas/pipeline.schema";
import { API_ROUTES } from "@/constants/routes.constants";
import type { ApiResponse } from "@/types";

export interface PipelineItemData {
  _id: string;
  projectId: string;
  category:
    | "repository"
    | "hosting"
    | "domain"
    | "database"
    | "storage"
    | "monitoring"
    | "analytics"
    | "ci-cd"
    | "api"
    | "docs"
    | "other";
  label: string;
  url: string;
  environment: "production" | "development" | "staging" | null;
  notes: string;
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

export function usePipelineList(projectId: string) {
  return useQuery<PipelineItemData[], ApiError>({
    queryKey: ["pipeline", projectId],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.PROJECT_PIPELINE(projectId));
      return handleResponse<PipelineItemData[]>(res);
    },
    enabled: !!projectId,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreatePipelineItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<PipelineItemData, ApiError, CreatePipelineItemInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.PROJECT_PIPELINE(projectId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<PipelineItemData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", projectId] });
      toast.success(`Resource "${data.label}" added.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add resource.");
    },
  });
}

export function useUpdatePipelineItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<PipelineItemData, ApiError, { id: string; data: UpdatePipelineItemInput }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(API_ROUTES.PIPELINE_ITEM(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<PipelineItemData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", projectId] });
      toast.success(`Resource "${data.label}" updated.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update resource.");
    },
  });
}

export function useDeletePipelineItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await fetch(API_ROUTES.PIPELINE_ITEM(id), {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", projectId] });
      toast.success("Resource deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete resource.");
    },
  });
}
