"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoginInput, RegisterInput } from "@/schemas/auth.schema";
import { API_ROUTES, ROUTES } from "@/constants/routes.constants";
import type { Session, ApiResponse } from "@/types";

/**
 * Custom error wrapper to expose server validation error messages
 */
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

// ─── Query Hook ───────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery<Session, ApiError>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.AUTH_ME);
      if (res.status === 401) {
        throw new ApiError("UNAUTHORIZED", "Not authenticated");
      }
      return handleResponse<Session>(res);
    },
    retry: false, // Don't spam retries on unauthenticated routes
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<Session, ApiError, LoginInput>({
    mutationFn: async (credentials) => {
      const res = await fetch(API_ROUTES.AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      return handleResponse<Session>(res);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      toast.success(`Welcome back, ${data.name}!`);
      router.push(ROUTES.DASHBOARD);
      router.refresh(); // Triggers Server Component layouts to reload with new session
    },
    onError: (error) => {
      toast.error(error.message || "Failed to log in.");
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<Session, ApiError, RegisterInput>({
    mutationFn: async (userData) => {
      const res = await fetch(API_ROUTES.AUTH_REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      return handleResponse<Session>(res);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      toast.success(`Account created successfully! Welcome, ${data.name}.`);
      router.push(ROUTES.DASHBOARD);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to register account.");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const res = await fetch(API_ROUTES.AUTH_LOGOUT, {
        method: "POST",
      });
      await handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
      queryClient.clear(); // Clear all cached project data on logout
      toast.success("Logged out successfully.");
      router.push(ROUTES.LOGIN);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to log out.");
    },
  });
}
