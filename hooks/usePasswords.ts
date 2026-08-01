"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreatePasswordInput, UpdatePasswordInput } from "@/schemas/password.schema";
import { API_ROUTES } from "@/constants/routes.constants";
import type { ApiResponse } from "@/types";

export interface PasswordData {
  _id: string;
  userId: string;
  projectId: string | null;
  label: string;
  username: string;
  url: string | null;
  category:
    | "repository"
    | "hosting"
    | "database"
    | "api"
    | "cloud"
    | "personal"
    | "shared"
    | "utility"
    | "other";
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

export function usePasswordsList(projectId?: string) {
  const url = projectId ? `${API_ROUTES.PASSWORDS}?projectId=${projectId}` : API_ROUTES.PASSWORDS;

  return useQuery<PasswordData[], ApiError>({
    queryKey: ["passwords", projectId || "global"],
    queryFn: async () => {
      const res = await fetch(url);
      return handleResponse<PasswordData[]>(res);
    },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreatePassword() {
  const queryClient = useQueryClient();

  return useMutation<PasswordData, ApiError, CreatePasswordInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.PASSWORDS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<PasswordData>(res);
    },
    onSuccess: (data) => {
      // Invalidate both lists since a global item can link to a project and vice-versa
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      toast.success(`Credential "${data.label}" added.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add credential.");
    },
  });
}

export function useUpdatePassword() {
  const queryClient = useQueryClient();

  return useMutation<PasswordData, ApiError, { id: string; data: UpdatePasswordInput }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(API_ROUTES.PASSWORD(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<PasswordData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      toast.success(`Credential "${data.label}" updated.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update credential.");
    },
  });
}

export function useDeletePassword() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await fetch(API_ROUTES.PASSWORD(id), {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      toast.success("Credential deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete credential.");
    },
  });
}

export function useRevealPassword(passwordId: string) {
  return useMutation<{ secret: string }, ApiError, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_ROUTES.PASSWORD(passwordId)}/reveal`, {
        method: "POST",
      });
      return handleResponse<{ secret: string }>(res);
    },
  });
}
