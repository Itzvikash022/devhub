"use client";

import { useEffect } from "react";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { usePendingInvitations, useAcceptInvitation, useRejectInvitation } from "@/hooks/useInvitations";
import { Inbox, Check, X, Building } from "lucide-react";
import { toast } from "sonner";

export default function InvitationsPage() {
  const { setHeader } = usePageHeader();

  useEffect(() => {
    setHeader({
      title: "Invitations",
    });
  }, [setHeader]);

  const { data: invitations, isLoading } = usePendingInvitations();
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();

  const handleAccept = (id: string) => {
    acceptMutation.mutate(id, {
      onSuccess: () => toast.success("Invitation accepted"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id, {
      onSuccess: () => toast.success("Invitation rejected"),
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading invitations...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 rounded-md p-2">
          <Inbox className="text-primary h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold">Pending Invitations</h1>
      </div>

      {!invitations || invitations.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border p-12 text-center">
          <Inbox className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
          <h3 className="text-foreground text-lg font-semibold">No Pending Invitations</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            You don't have any pending project invitations right now.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {invitations.map((inv) => (
            <div
              key={inv._id}
              className="border-border bg-card hover:border-primary/50 group flex flex-col rounded-xl border p-5 transition-colors"
            >
              <div className="mb-4 flex items-start gap-4">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Building className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-foreground truncate font-semibold">{inv.projectId?.name || "Unknown Project"}</h3>
                  <p className="text-muted-foreground truncate text-sm">
                    Invited by <span className="font-medium text-[oklch(0.85_0.005_240)]">{inv.inviterId?.name}</span>
                  </p>
                </div>
              </div>

              <div className="mt-auto flex gap-3">
                <button
                  onClick={() => handleAccept(inv._id)}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Accept
                </button>
                <button
                  onClick={() => handleReject(inv._id)}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  className="border-border text-foreground hover:bg-muted flex flex-1 items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
