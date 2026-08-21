"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useProjectDetails, useDeleteProject } from "@/hooks/useProjects";
import { useMe } from "@/hooks/useAuth";
import { Settings, ShieldAlert, Trash2, Users, Sliders, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function ProjectSettingsPage() {
  const { id } = useParams() as { id: string };
  const { setHeader } = usePageHeader();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: project, isLoading } = useProjectDetails(id);
  const { mutate: deleteProject, isPending: isDeletePending } = useDeleteProject(id);
  const { data: user } = useMe();

  const projectOwnerId = project?.userId?._id || project?.userId;
  const isOwner = user && projectOwnerId === user.userId;

  useEffect(() => {
    setHeader({
      title: "Project Settings",
    });
  }, [setHeader]);

  const handleDeleteConfirm = (password?: string) => {
    deleteProject(
      { password },
      {
        onSuccess: () => {
          setDeleteOpen(false);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 text-xs text-muted-foreground">Loading project settings...</div>;
  }

  if (!project) {
    return <div className="p-6 text-xs text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="bg-primary/10 rounded-md p-2">
          <Settings className="text-primary h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Project Settings</h1>
          <p className="text-xs text-muted-foreground">Manage preferences and configurations for "{project.name}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side Navigation Categories */}
        <div className="md:col-span-1 space-y-1">
          <button className="w-full text-left px-3 py-2 text-xs font-medium rounded-md bg-primary/15 text-primary flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            General
          </button>
          <button className="w-full text-left px-3 py-2 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center gap-2 cursor-not-allowed opacity-60">
            <Users className="w-4 h-4" />
            Members
          </button>
          <button className="w-full text-left px-3 py-2 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center gap-2 cursor-not-allowed opacity-60">
            <Lock className="w-4 h-4" />
            Security
          </button>
        </div>

        {/* Right Side Content */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Project Configurations
              </h2>
              <p className="text-xs text-muted-foreground">
                Edit core properties of your project workspace. Additional options will be added here in the future.
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {isOwner && (
            <Card className="border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/5">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Danger Area
                </h2>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this project. This action cannot be undone and will delete all project data including tracker items, files, and progress logs.
                </p>
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2 h-9 text-xs cursor-pointer"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${project.name}"?`}
        description="Are you sure you want to permanently delete this project? All associated global vault assets will remain intact but will be unlinked from this workspace."
        confirmLabel="Delete permanently"
        onConfirm={handleDeleteConfirm}
        loading={isDeletePending}
        requirePassword={true}
      />
    </div>
  );
}
