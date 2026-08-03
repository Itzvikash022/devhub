"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/schemas/calendar-event.schema";
import { API_ROUTES } from "@/constants/routes.constants";
import type { ApiResponse } from "@/types";

export interface CalendarEventData {
  _id: string;
  userId: string;
  projectId: string | null;
  title: string;
  date: string;
  type: "personal" | "milestone" | "deadline" | "meeting" | "release";
  source: "manual" | "task" | "milestone";
  sourceId: string | null;
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

export function useCalendarList(projectId?: string) {
  const url = projectId ? `${API_ROUTES.CALENDAR}?projectId=${projectId}` : API_ROUTES.CALENDAR;

  return useQuery<CalendarEventData[], ApiError>({
    queryKey: ["calendar-events", projectId || "global"],
    queryFn: async () => {
      const res = await fetch(url);
      return handleResponse<CalendarEventData[]>(res);
    },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation<CalendarEventData, ApiError, CreateCalendarEventInput>({
    mutationFn: async (data) => {
      const res = await fetch(API_ROUTES.CALENDAR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<CalendarEventData>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Event scheduled successfully.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to schedule event.");
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation<CalendarEventData, ApiError, { id: string; data: UpdateCalendarEventInput }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(API_ROUTES.CALENDAR_EVENT(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<CalendarEventData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`Event "${data.title}" updated.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update event.");
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const res = await fetch(API_ROUTES.CALENDAR_EVENT(id), {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Event deleted.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete event.");
    },
  });
}
