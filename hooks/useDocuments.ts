"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDocumentInput, UpdateDocumentInput } from "@/schemas/document.schema";
import { API_ROUTES } from "@/constants/routes.constants";
import type { ApiResponse } from "@/types";

export interface DocumentData {
  _id: string;
  userId: string;
  projectId: string | null;
  title: string;
  r2Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category:
    | "requirement"
    | "contract"
    | "specification"
    | "architecture"
    | "meeting-report"
    | "research"
    | "other";
  uploadedAt: string;
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

export function useDocumentsList(projectId?: string) {
  const url = projectId ? `${API_ROUTES.DOCUMENTS}?projectId=${projectId}` : API_ROUTES.DOCUMENTS;

  return useQuery<DocumentData[], ApiError>({
    queryKey: ["documents", projectId || "global"],
    queryFn: async () => {
      const res = await fetch(url);
      return handleResponse<DocumentData[]>(res);
    },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function usePresignDocument(projectId?: string) {
  const url = projectId
    ? `${API_ROUTES.DOCUMENTS_PRESIGN}?projectId=${projectId}`
    : API_ROUTES.DOCUMENTS_PRESIGN;

  return useMutation<
    { uploadUrl: string; r2Key: string },
    ApiError,
    { fileName: string; fileType: string }
  >({
    mutationFn: async ({ fileName, fileType }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileType }),
      });
      return handleResponse<{ uploadUrl: string; r2Key: string }>(res);
    },
  });
}

export function useConfirmDocument() {
  const queryClient = useQueryClient();

  return useMutation<DocumentData, ApiError, ConfirmDocumentInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.DOCUMENTS_CONFIRM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<DocumentData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`Document "${data.title}" uploaded.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to finalize document upload.");
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation<DocumentData, ApiError, { id: string; data: UpdateDocumentInput }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(API_ROUTES.DOCUMENT(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<DocumentData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`Document "${data.title}" updated.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update document.");
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await fetch(API_ROUTES.DOCUMENT(id), {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Document deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete document.");
    },
  });
}
