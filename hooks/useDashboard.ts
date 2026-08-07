"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types";

export interface DashboardProject {
  _id: string;
  name: string;
  description: string;
  status: "active" | "on-hold" | "archived";
  createdAt: string;
  updatedAt: string;
  noteCount?: number;
  taskCount?: number;
}

export interface DashboardDeadline {
  _id: string;
  title: string;
  date: string;
  type: "personal" | "milestone" | "deadline" | "meeting" | "release";
  source: "manual" | "task" | "milestone";
  projectId: string | null;
}

export interface DashboardTask {
  _id: string;
  projectId: string;
  title: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardActivity {
  id: string;
  type: "note" | "task" | "document";
  title: string;
  updatedAt: string;
  projectId: string | null;
  status?: "todo" | "in-progress" | "blocked" | "done";
}

export interface DashboardData {
  recentProjects: DashboardProject[];
  upcomingDeadlines: DashboardDeadline[];
  highPriorityTasks: DashboardTask[];
  recentActivity: DashboardActivity[];
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

export function useDashboardData(projectId?: string | null) {
  return useQuery<DashboardData, ApiError>({
    queryKey: projectId ? ["dashboard-data", projectId] : ["dashboard-data"],
    queryFn: async () => {
      const url = projectId ? `/api/dashboard?projectId=${projectId}` : "/api/dashboard";
      const res = await fetch(url);
      return handleResponse<DashboardData>(res);
    },
  });
}
