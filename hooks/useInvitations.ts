import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ROUTES } from "@/constants/routes.constants";

export interface ProjectInvitation {
  _id: string;
  projectId: {
    _id: string;
    name: string;
    description: string;
  };
  inviterId: {
    _id: string;
    name: string;
    email: string;
  };
  inviteeEmail: string;
  role: string;
  status: string;
  createdAt: string;
}

export function usePendingInvitations() {
  return useQuery<ProjectInvitation[]>({
    queryKey: ["invitations", "pending"],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.INVITATIONS);
      if (!res.ok) throw new Error("Failed to fetch pending invitations");
      return res.json();
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_ROUTES.INVITATIONS}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRejectInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_ROUTES.INVITATIONS}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, email }: { projectId: string; email: string }) => {
      const res = await fetch(API_ROUTES.INVITATIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to invite user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}
