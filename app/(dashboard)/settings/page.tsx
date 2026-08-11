"use client";

import { useEffect } from "react";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { usePendingInvitations, useAcceptInvitation, useRejectInvitation } from "@/hooks/useInvitations";
import { Inbox, Check, X, Building, Settings, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const { setHeader } = usePageHeader();

  useEffect(() => {
    setHeader({
      title: "Settings",
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

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="bg-primary/10 rounded-md p-2">
          <Settings className="text-primary h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Global Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your invitations and system preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side: Navigation categories */}
        <div className="md:col-span-1 space-y-1">
          <button className="w-full text-left px-3 py-2 text-xs font-medium rounded-md bg-primary/15 text-primary flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Invitations
          </button>
          <button className="w-full text-left px-3 py-2 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center gap-2 cursor-not-allowed opacity-60">
            <User className="w-4 h-4" />
            Account
          </button>
          <button className="w-full text-left px-3 py-2 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center gap-2 cursor-not-allowed opacity-60">
            <Shield className="w-4 h-4" />
            Security
          </button>
        </div>

        {/* Right Side: Section content */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Inbox className="w-4 h-4 text-primary" />
                Pending Invitations
              </h2>
              <p className="text-xs text-muted-foreground">
                Respond to project invitations sent by other team owners.
              </p>

              {isLoading ? (
                <div className="text-xs text-muted-foreground py-4">Loading invitations...</div>
              ) : !invitations || invitations.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 text-center bg-muted/10">
                  <Inbox className="text-muted-foreground/40 mb-3 h-8 w-8 mx-auto" />
                  <h3 className="text-foreground text-xs font-semibold">No Pending Invitations</h3>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    You don't have any pending project invitations right now.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv._id}
                      className="border border-border bg-card hover:border-primary/50 group flex flex-col rounded-xl p-4 transition-colors"
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                          <Building className="h-4 w-4" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h3 className="text-foreground truncate text-xs font-semibold">{inv.projectId?.name || "Unknown Project"}</h3>
                          <p className="text-muted-foreground truncate text-[10px]">
                            Inviter: <span className="font-medium text-[oklch(0.85_0.005_240)]">{inv.inviterId?.name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleAccept(inv._id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(inv._id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          className="border border-border text-foreground hover:bg-muted flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
