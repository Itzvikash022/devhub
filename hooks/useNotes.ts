"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreateNoteInput, UpdateNoteInput, ReorderNotesInput } from "@/schemas/note.schema";
import type { ApiResponse } from "@/types";

export interface NoteData {
  _id: string;
  projectId: string;
  title: string;
  content: string; // JSON string
  order: number;
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

export function useNotesList(projectId: string) {
  return useQuery<NoteData[], ApiError>({
    queryKey: ["notes", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/notes`);
      return handleResponse<NoteData[]>(res);
    },
    enabled: !!projectId,
  });
}

export function useNoteDetails(id: string) {
  return useQuery<NoteData, ApiError>({
    queryKey: ["note", id],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${id}`);
      return handleResponse<NoteData>(res);
    },
    enabled: !!id,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateNote(projectId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<NoteData, ApiError, CreateNoteInput>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<NoteData>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes", projectId] });
      toast.success("New page created.");
      router.push(`/projects/${projectId}/notes/${data._id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create page.");
    },
  });
}

export function useUpdateNote(id: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<NoteData, ApiError, UpdateNoteInput>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<NoteData>(res);
    },
    onSuccess: () => {
      // Invalidate queries to refresh sidebar list & editor state
      queryClient.invalidateQueries({ queryKey: ["notes", projectId] });
      queryClient.invalidateQueries({ queryKey: ["note", id] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save note.");
    },
  });
}

export function useDeleteNote(id: string, projectId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", projectId] });
      queryClient.removeQueries({ queryKey: ["note", id] });
      toast.success("Page deleted successfully.");
      router.push(`/projects/${projectId}/notes`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete page.");
    },
  });
}

export function useReorderNotes(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, ReorderNotesInput, { previousNotes: NoteData[] | undefined }>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/projects/${projectId}/notes/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<void>(res);
    },
    onMutate: async (newOrder) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["notes", projectId] });
      const previousNotes = queryClient.getQueryData<NoteData[]>(["notes", projectId]);

      if (previousNotes) {
        // Map new orders onto existing notes
        const orderMap = new Map(newOrder.map((item) => [item.id, item.order]));
        const sortedNotes = [...previousNotes]
          .map((note) => ({
            ...note,
            order: orderMap.has(note._id) ? orderMap.get(note._id)! : note.order,
          }))
          .sort((a, b) => a.order - b.order);

        queryClient.setQueryData(["notes", projectId], sortedNotes);
      }

      return { previousNotes };
    },
    onError: (err, newOrder, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes", projectId], context.previousNotes);
      }
      toast.error("Failed to save reordering.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", projectId] });
    },
  });
}
