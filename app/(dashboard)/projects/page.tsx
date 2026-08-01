"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderPlus, Search, FolderClosed, RefreshCcw } from "lucide-react";
import { useProjectsList } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ROUTES } from "@/constants/routes.constants";
import { cn } from "@/lib/utils";

type ProjectStatusFilter = "all" | "active" | "on-hold" | "archived";

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all projects for the user. We filter client-side for smooth search/tab transitions.
  const { data: projects = [], isLoading, error, refetch } = useProjectsList();

  const filteredProjects = projects.filter((project) => {
    // 1. Status Filter
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;

    // 2. Search Query
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Page Header */}
      <PageHeader
        title="Projects"
        subtitle="Manage your workspaces and active side-projects."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <FolderPlus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        }
      />

      {/* Filters and Search controls */}
      <div className="border-border flex flex-col items-stretch justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <Tabs
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as ProjectStatusFilter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-muted/50 border-border border">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              Active
            </TabsTrigger>
            <TabsTrigger value="on-hold" className="text-xs text-amber-600">
              On-Hold
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs text-zinc-500">
              Archived
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search projects..."
            className="bg-card pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Grid / Content area */}
      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton rows={4} />
        </div>
      ) : error ? (
        <EmptyState
          icon={RefreshCcw}
          title="Failed to load projects"
          description={error.message || "An unexpected network error occurred."}
          action={{
            label: "Retry Query",
            onClick: () => refetch(),
          }}
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderClosed}
          title={
            searchQuery
              ? "No matching projects found"
              : `No ${statusFilter !== "all" ? statusFilter : ""} projects yet`
          }
          description={
            searchQuery
              ? "Try adjusting your search filters or status tabs."
              : "Kickstart your workspace by setting up your first project."
          }
          action={
            !searchQuery && statusFilter === "all"
              ? {
                  label: "New Project",
                  onClick: () => setDialogOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project._id}
              className={cn(
                "border-border bg-card border transition-shadow hover:shadow-md",
                project.status === "archived" && "opacity-75"
              )}
            >
              <CardHeader className="space-y-1.5 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={ROUTES.PROJECT(project._id)}
                    className="font-heading text-foreground truncate text-lg font-semibold hover:underline"
                  >
                    {project.name}
                  </Link>
                  <ProjectStatusBadge status={project.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-muted-foreground line-clamp-3 h-12 text-xs">
                  {project.description || "No description provided."}
                </CardDescription>
                <div className="border-border/50 text-muted-foreground flex items-center justify-between border-t pt-3 font-mono text-[10px]">
                  <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                  <Link
                    href={ROUTES.PROJECT(project._id)}
                    className="text-primary font-semibold hover:underline"
                  >
                    Open Workspace →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for Creation/Editing */}
      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
