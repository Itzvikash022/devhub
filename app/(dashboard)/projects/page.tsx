"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Layers, FileText, CheckSquare, Archive } from "lucide-react";
import { useProjectsList } from "@/hooks/useProjects";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/shared/StatusChip";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { ROUTES } from "@/constants/routes.constants";
import { formatDistanceToNow } from "date-fns";

type FilterStatus = "all" | "active" | "on-hold" | "archived";

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "archived", label: "Archived" },
];

export default function ProjectsPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: projects = [], isLoading, error } = useProjectsList();

  const filtered = projects.filter((project) => {
    // 1. Status Filter
    const matchesStatus = filter === "all" || project.status === filter;

    // 2. Search Query
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6 p-6">
        {/* Header Loading */}
        <div className="flex items-center justify-between pb-4">
          <div className="space-y-2">
            <div className="bg-muted h-7 w-32 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-9 w-28 animate-pulse rounded" />
        </div>

        {/* Filters Loading */}
        <div className="flex gap-2 mb-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted h-7 w-16 animate-pulse rounded-md" />
          ))}
        </div>

        {/* Grid Loading */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#F8F9F5] border-[#DAD8CE] h-40 animate-pulse rounded-lg border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <SetPageHeader
        title="Projects"
        actions={
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-inter text-[13px] transition-colors"
            style={{ backgroundColor: "var(--accent-color)", color: "#fff" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#4338a8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-color)")}
          >
            <Plus className="w-3.5 h-3.5" />
            New project
          </button>
        }
      />
      <div className="mx-auto max-w-[1100px] space-y-6 p-6 text-left">

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DAD8CE] pb-4">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-md font-mono text-[11px] tracking-wide uppercase border transition-colors ${
                filter === f.value
                  ? "bg-[#4F46C7] text-white border-[#4F46C7]"
                  : "text-[#6B6E64] border-[#DAD8CE] bg-[#F8F9F5] hover:border-[#4F46C7] hover:text-[#4F46C7]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-2 font-mono text-[11px] text-[#6B6E64] hidden sm:inline">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search projects..."
            className="bg-[#F8F9F5] border-[#DAD8CE] focus:border-[#4F46C7] focus:ring-0 pl-9 font-inter text-[14px] rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-destructive p-6 text-center font-mono text-xs">
          Failed to load project workspaces.
        </div>
      )}

      {/* Empty State */}
      {!error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#EBE9F9] flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-[#4F46C7]" />
          </div>
          <p className="font-heading text-xl text-[#20221F] mb-1">No projects here</p>
          <p className="font-inter text-[13px] text-[#6B6E64] mb-4">
            {filter === "all"
              ? "Create your first project to get started."
              : `No projects with status "${filter}".`}
          </p>
          {filter === "all" && (
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#4F46C7] text-white font-inter text-sm"
            >
              <Plus className="w-4 h-4" />
              New project
            </button>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {!error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project._id}
              href={ROUTES.PROJECT_NOTES(project._id) as any}
              className="flex flex-col p-5 rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] hover:border-[#4F46C7] transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-heading text-[17px] font-medium text-[#20221F] group-hover:text-[#4F46C7] transition-colors leading-tight truncate max-w-[180px]">
                  {project.name}
                </h3>
                <StatusChip status={project.status as any} className="ml-2 shrink-0" />
              </div>
              <p className="font-inter text-[13px] text-[#6B6E64] flex-1 line-clamp-3 mb-4">
                {project.description || "No description yet."}
              </p>
              <div className="border-t border-[#DAD8CE] pt-3 flex items-center gap-4 font-mono text-[11px] text-[#6B6E64]">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {project.noteCount || 0}
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  {project.taskCount || 0}
                </span>
                {project.status === "archived" && (
                  <span className="flex items-center gap-1">
                    <Archive className="w-3 h-3" />
                    archived
                  </span>
                )}
                <span className="ml-auto">
                  {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Dialog for creation */}
      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
    </>
  );
}
