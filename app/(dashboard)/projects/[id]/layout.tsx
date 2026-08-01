"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronLeft, Edit2, Archive, Trash2, Loader2, ArchiveRestore } from "lucide-react";
import { useProjectDetails, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { StatusChip } from "@/components/shared/StatusChip";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { ROUTES } from "@/constants/routes.constants";
import { cn } from "@/lib/utils";

interface ProjectWorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function ProjectWorkspaceLayout({ children }: ProjectWorkspaceLayoutProps) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: project, isLoading, error } = useProjectDetails(id);
  const { mutate: updateProject, isPending: isArchivePending } = useUpdateProject(id);
  const { mutate: deleteProject, isPending: isDeletePending } = useDeleteProject(id);

  const isPending = isArchivePending || isDeletePending;

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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-dim)" }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-2xl border border-[#DAD8CE] bg-[#F8F9F5] p-8 text-center shadow-xs">
        <h2 className="font-heading text-lg font-semibold text-[#20221F]">
          Project Not Found
        </h2>
        <p className="mt-2 font-inter text-xs text-[#6B6E64]">
          {error?.message || "The requested project workspace does not exist or has been deleted."}
        </p>
        <Link
          href={ROUTES.PROJECTS}
          className="mt-5 inline-flex items-center justify-center rounded-md bg-[#4F46C7] px-4 py-2 font-inter text-xs font-medium text-white transition-colors hover:bg-[#4338a8]"
        >
          Return to Projects List
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

  // Action buttons for the topbar
  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEditOpen(true)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-inter text-[12px] transition-colors disabled:opacity-50"
        style={{ borderColor: "var(--line)", backgroundColor: "var(--paper-raised)", color: "var(--text-dim)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
      >
        <Edit2 className="h-3.5 w-3.5" />
        Edit
      </button>
      <button
        onClick={handleToggleArchive}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-inter text-[12px] transition-colors disabled:opacity-50"
        style={{ borderColor: "var(--line)", backgroundColor: "var(--paper-raised)", color: "var(--text-dim)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
      >
        {project.status === "archived" ? (
          <><ArchiveRestore className="h-3.5 w-3.5" />Restore</>
        ) : (
          <><Archive className="h-3.5 w-3.5" />Archive</>
        )}
      </button>
      <button
        onClick={() => { setEditOpen(false); setDeleteOpen(true); }}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-inter text-[12px] transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--red)", color: "#fff" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Push project name into the topbar */}
      <SetPageHeader
        title={project.name}
        actions={headerActions}
      />

      {/* Sub-nav: back link + status chip + tabs */}
      <div
        className="shrink-0 border-b px-6 pt-3 pb-0 space-y-3"
        style={{ borderColor: "var(--line)", backgroundColor: "var(--paper)" }}
      >
        {/* Back + status row */}
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.PROJECTS}
            className="inline-flex items-center gap-1 font-inter text-[12px] transition-colors"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
          >
            <ChevronLeft className="h-3 w-3" />
            Projects
          </Link>
          <span style={{ color: "var(--line)" }}>/</span>
          <StatusChip status={project.status as any} />
        </div>

        {/* Tab sub-navigation */}
        <div className="no-scrollbar flex items-center gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "border-b-2 px-3 py-2 font-inter text-[13px] whitespace-nowrap transition-colors",
                  active
                    ? "border-[#4F46C7] text-[#4F46C7] font-medium"
                    : "border-transparent hover:text-[#20221F]"
                )}
                style={!active ? { color: "var(--text-dim)" } : {}}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Nested tab page contents */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--paper)" }}>
        {children}
      </div>

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
