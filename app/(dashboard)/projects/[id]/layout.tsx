"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Edit2, Archive, Trash2, Loader2, ArchiveRestore } from "lucide-react";
import { useProjectDetails, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ROUTES } from "@/constants/routes.constants";
import { cn } from "@/lib/utils";

interface ProjectWorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function ProjectWorkspaceLayout({ children }: ProjectWorkspaceLayoutProps) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: project, isLoading, error } = useProjectDetails(id);
  const { mutate: updateProject, isPending: isArchivePending } = useUpdateProject(id);
  const { mutate: deleteProject, isPending: isDeletePending } = useDeleteProject(id);

  const isPending = isArchivePending || isDeletePending;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-destructive text-lg font-medium">Failed to load project</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {error?.message || "The project details could not be found."}
        </p>
        <Link
          href={ROUTES.PROJECTS}
          className="text-primary mt-4 inline-flex text-xs hover:underline"
        >
          Back to Projects List
        </Link>
      </div>
    );
  }

  const handleToggleArchive = () => {
    const nextStatus = project.status === "archived" ? "active" : "archived";
    updateProject({ status: nextStatus });
  };

  const handleDelete = () => {
    deleteProject(undefined, {
      onSuccess: () => {
        setDeleteOpen(false);
      },
    });
  };

  const tabs = [
    { label: "Notes", href: ROUTES.PROJECT_NOTES(id) },
    { label: "Details", href: ROUTES.PROJECT_DETAILS(id) },
    { label: "Progress", href: ROUTES.PROJECT_PROGRESS(id) },
    { label: "Pipeline", href: ROUTES.PROJECT_PIPELINE(id) },
    { label: "Images", href: ROUTES.PROJECT_IMAGES(id) },
    { label: "Passwords", href: ROUTES.PROJECT_PASSWORDS(id) },
    { label: "Documents", href: ROUTES.PROJECT_DOCUMENTS(id) },
    { label: "Calendar", href: ROUTES.PROJECT_CALENDAR(id) },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Project Detail Header */}
      <div className="border-border bg-card space-y-3 border-b px-6 py-4">
        {/* Back Link */}
        <Link
          href={ROUTES.PROJECTS}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to Projects
        </Link>

        {/* Title Area */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-foreground text-2xl font-semibold">
                {project.name}
              </h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="text-muted-foreground max-w-2xl text-xs">{project.description}</p>
            )}
          </div>

          {/* Header Action Buttons */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setEditOpen(true)}
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleToggleArchive}>
              {project.status === "archived" ? (
                <>
                  <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  Archive
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setEditOpen(false);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Tab Sub-Navigation */}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto pt-2">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-t-lg border-b-2 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Nested Tab Page Contents */}
      <div className="bg-background flex-1 overflow-y-auto">{children}</div>

      {/* Dialogs */}
      <ProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={{
          id: project._id,
          name: project.name,
          description: project.description,
          status: project.status,
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${project.name}"?`}
        description="Are you sure you want to permanently delete this project? All associated global vault assets will remain intact but will be unlinked from this workspace."
        confirmLabel="Delete permanently"
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  );
}
