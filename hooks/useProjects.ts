"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreateProjectInput, UpdateProjectInput } from "@/schemas/project.schema";
import { UpdateProjectDetailInput } from "@/schemas/project-detail.schema";
import { API_ROUTES, ROUTES } from "@/constants/routes.constants";
import type { ApiResponse } from "@/types";

export interface ProjectData {
  _id: string;
  name: string;
  description: string;
  status: "active" | "on-hold" | "archived";
  createdAt: string;
  updatedAt: string;
  noteCount?: number;
  taskCount?: number;
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

export function useProjectsList(filter?: { status?: string }) {
  const statusParam = filter?.status ? `?status=${filter.status}` : "";
  return useQuery<ProjectData[], ApiError>({
    queryKey: ["projects", filter?.status],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.PROJECTS}${statusParam}`);
      return handleResponse<ProjectData[]>(res);
    },
  });
}

export function useProjectDetails(id: string) {
  return useQuery<ProjectData, ApiError>({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.PROJECT(id));
      return handleResponse<ProjectData>(res);
    },
    enabled: !!id,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectData, ApiError, CreateProjectInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.PROJECTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<ProjectData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Project "${data.name}" created successfully!`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project.");
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation<ProjectData, ApiError, UpdateProjectInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.PROJECT(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<ProjectData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success(`Project "${data.name}" updated successfully.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project.");
    },
  });
}

export function useDeleteProject(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const res = await fetch(API_ROUTES.PROJECT(id), {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.removeQueries({ queryKey: ["project", id] });
      toast.success("Project deleted successfully.");
      router.push(ROUTES.PROJECTS);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project.");
    },
  });
}

// ─── Project Custom Details Hooks ─────────────────────────────────────────────

export interface ProjectField {
  key: string;
  value: string;
  type: "text" | "list" | "link" | "tag[]";
}

export interface ProjectSection {
  heading: string;
  fields: ProjectField[];
}

export interface ProjectDetailData {
  _id: string;
  projectId: string;
  sections: ProjectSection[];
  createdAt: string;
  updatedAt: string;
}

export function useProjectCustomDetails(projectId: string) {
  return useQuery<ProjectDetailData, ApiError>({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.PROJECT_DETAILS(projectId));
      return handleResponse<ProjectDetailData>(res);
    },
    enabled: !!projectId,
  });
}

export function useUpdateProjectCustomDetails(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<ProjectDetailData, ApiError, UpdateProjectDetailInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.PROJECT_DETAILS(projectId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<ProjectDetailData>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-details", projectId] });
      toast.success("Project details saved successfully.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save project details.");
    },
  });
}
