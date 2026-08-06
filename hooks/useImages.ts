"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmImageAssetInput } from "@/schemas/image-asset.schema";
import { API_ROUTES } from "@/constants/routes.constants";
import type { ApiResponse } from "@/types";

export interface ImageAssetData {
  _id: string;
  projectId: string;
  name: string;
  r2Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: "mockup" | "screenshot" | "architecture" | "asset" | "other";
  description: string;
  expiryDate: string | null;
  isEncrypted: boolean;
  width?: number | null;
  height?: number | null;
  thumbnail?: string | null;
  originalKey?: string | null;
  thumbnailKey?: string | null;
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

export interface ImagesFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  sortBy?: string;
}

export interface PaginatedImagesResponse {
  items: ImageAssetData[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useImagesList(projectId?: string, filters?: ImagesFilters) {
  return useQuery<PaginatedImagesResponse, ApiError>({
    queryKey: ["images", projectId || "global", filters],
    queryFn: async () => {
      let url = projectId ? API_ROUTES.PROJECT_IMAGES(projectId) : "/api/images";
      const params = new URLSearchParams();
      if (filters) {
        if (filters.page) params.append("page", filters.page.toString());
        if (filters.pageSize) params.append("pageSize", filters.pageSize.toString());
        if (filters.search) params.append("search", filters.search);
        if (filters.category) params.append("category", filters.category);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const res = await fetch(url);
      return handleResponse<PaginatedImagesResponse>(res);
    },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function usePresignImage(projectId: string) {
  return useMutation<
    { uploadUrl: string; r2Key: string },
    ApiError,
    { fileName: string; fileType: string }
  >({
    mutationFn: async ({ fileName, fileType }) => {
      const res = await fetch(`/api/projects/${projectId}/images/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileType }),
      });
      return handleResponse<{ uploadUrl: string; r2Key: string }>(res);
    },
  });
}

export function usePresignImageBatch(projectId: string) {
  return useMutation<
    Array<{ fileName: string; uploadUrl: string; r2Key: string }>,
    ApiError,
    { files: Array<{ fileName: string; fileType: string }> }
  >({
    mutationFn: async ({ files }) => {
      const res = await fetch(`/api/projects/${projectId}/images/presign-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      return handleResponse<Array<{ fileName: string; uploadUrl: string; r2Key: string }>>(res);
    },
  });
}

export function useConfirmImage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<ImageAssetData, ApiError, ConfirmImageAssetInput>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/projects/${projectId}/images/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<ImageAssetData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`Image "${data.name}" uploaded successfully.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to finalize image upload.");
    },
  });
}

export function useConfirmImageBatch(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<ImageAssetData[], ApiError, { items: ConfirmImageAssetInput[] }>({
    mutationFn: async ({ items }) => {
      const res = await fetch(`/api/projects/${projectId}/images/confirm-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      return handleResponse<ImageAssetData[]>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });
}

export function useDecryptImage(projectId: string, imageId: string) {
  return useMutation<{ decryptedData: string }, ApiError, string>({
    mutationFn: async (passphrase) => {
      const res = await fetch(`${API_ROUTES.IMAGE(imageId)}/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      return handleResponse<{ decryptedData: string }>(res);
    },
  });
}

export function useDeleteImage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await fetch(API_ROUTES.IMAGE(id), {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Image deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete image.");
    },
  });
}

export function useBulkDeleteImages() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string[]>({
    mutationFn: async (ids) => {
      const res = await fetch("/api/images/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Selected images deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete selected images.");
    },
  });
}

export function useBulkUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { ids: string[]; category: string }>({
    mutationFn: async ({ ids, category }) => {
      const res = await fetch("/api/images/bulk-update-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, category }),
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast.success("Category updated for selected images.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update categories.");
    },
  });
}
