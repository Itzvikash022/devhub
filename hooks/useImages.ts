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

export function useImagesList(projectId?: string) {
  return useQuery<ImageAssetData[], ApiError>({
    queryKey: ["images", projectId || "global"],
    queryFn: async () => {
      const url = projectId ? API_ROUTES.PROJECT_IMAGES(projectId) : "/api/images";
      const res = await fetch(url);
      return handleResponse<ImageAssetData[]>(res);
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
      toast.success(`Image "${data.name}" uploaded successfully.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to finalize image upload.");
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
      toast.success("Image deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete image.");
    },
  });
}
