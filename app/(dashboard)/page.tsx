"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  FileText,
  BookOpen,
  CheckSquare,
  Plus,
  ChevronRight,
  ArrowRight,
  History,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { ROUTES } from "@/constants/routes.constants";
import { formatDate, formatRelativeTime } from "@/utils/formatDate";

const DEADLINE_COLORS: Record<string, string> = {
  personal: "border-l-blue-500",
  milestone: "border-l-amber-500",
  deadline: "border-l-rose-500",
  meeting: "border-l-emerald-500",
  release: "border-l-purple-500",
};

const DEADLINE_BG: Record<string, string> = {
  personal: "bg-blue-500/10 text-blue-500",
  milestone: "bg-amber-500/10 text-amber-500",
  deadline: "bg-rose-500/10 text-rose-500",
  meeting: "bg-emerald-500/10 text-emerald-500",
  release: "bg-purple-500/10 text-purple-500",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  "in-progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  blocked: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  done: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  blocked: "Blocked",
  done: "Done",
};

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardData();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {/* Header Loading */}
        <div className="space-y-2">
          <div className="bg-muted h-7 w-48 animate-pulse rounded" />
          <div className="bg-muted h-4 w-36 animate-pulse rounded" />
        </div>

        {/* Project Cards Loading */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted border-border h-28 animate-pulse rounded-lg border" />
          ))}
        </div>

        {/* Layout Split Loading */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-muted border-border h-64 animate-pulse rounded-lg border" />
          </div>
          <div className="space-y-6">
            <div className="bg-muted border-border h-64 animate-pulse rounded-lg border" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-destructive p-6 text-center">Failed to load dashboard metrics.</div>
    );
  }

  const { recentProjects, upcomingDeadlines, highPriorityTasks, recentActivity } = data;

  const handleCreateProjectClick = () => {
    setProjectDialogOpen(true);
  };

  // Render project-empty states dynamically
  if (recentProjects.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="mb-1">
          <h1 className="font-heading text-foreground text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <Card className="bg-card border-border mt-12 border">
          <CardContent className="p-0">
            <EmptyState
              icon={LayoutDashboard}
              title="Welcome to DevHub!"
              description="To get started, create your first project workspace. This will unlock notes, tasks, vaults, and calendar features."
              action={{
                label: "Create First Project",
                onClick: handleCreateProjectClick,
              }}
            />
          </CardContent>
        </Card>

        <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Dashboard Top Header */}
      <div className="border-border/55 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-xs">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button size="sm" onClick={handleCreateProjectClick} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Recent Project Workspace shortcuts */}
      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground font-mono text-sm font-semibold tracking-wider uppercase">
            Recent Workspaces
          </h3>
          <Link
            href={ROUTES.PROJECTS}
            className="text-primary flex items-center gap-0.5 text-xs font-medium hover:underline"
          >
            <span>All Projects</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentProjects.map((project) => (
            <Link key={project._id} href={ROUTES.PROJECT_NOTES(project._id) as any}>
              <Card className="bg-card border-border hover:border-primary/45 group relative flex h-28 cursor-pointer flex-col justify-between overflow-hidden border p-3 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-foreground group-hover:text-primary truncate text-sm font-semibold transition-colors">
                      {project.name}
                    </h4>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {project.description || "No project description provided."}
                  </p>
                </div>
                <div className="text-muted-foreground/60 border-border/30 flex items-center justify-between border-t pt-1.5 text-[10px]">
                  <span className="font-mono tracking-wider uppercase">{project.status}</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Aggregated widgets grid split */}
      <div className="grid grid-cols-1 gap-6 text-left lg:grid-cols-3">
        {/* Left widgets */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upcoming Deadlines next 7 days */}
          <Card className="bg-card border-border border">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="text-primary h-4.5 w-4.5" />
                  <h3 className="text-foreground text-sm font-semibold">Upcoming Deadlines</h3>
                </div>
                <Link
                  href={ROUTES.CALENDAR}
                  className="text-primary inline-flex items-center gap-0.5 text-xs font-medium hover:underline"
                >
                  <span>View Calendar</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-xs">
                  No upcoming deadlines or meetings scheduled in the next 7 days.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {upcomingDeadlines.map((deadline) => {
                    const project = recentProjects.find((p) => p._id === deadline.projectId);

                    return (
                      <Link
                        key={deadline._id}
                        href={
                          (deadline.projectId
                            ? ROUTES.PROJECT_PROGRESS(deadline.projectId)
                            : ROUTES.CALENDAR) as any
                        }
                      >
                        <div
                          className={`bg-muted/15 border-border border-l-solid hover:border-primary/20 flex h-20 flex-col justify-between rounded border border-l-4 p-3 text-xs transition-all ${
                            DEADLINE_COLORS[deadline.type] || "border-l-zinc-400"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-foreground max-w-[130px] truncate font-semibold">
                                {deadline.title}
                              </span>
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase ${
                                  DEADLINE_BG[deadline.type] ||
                                  "text-muted-foreground bg-zinc-500/10"
                                }`}
                              >
                                {deadline.type}
                              </span>
                            </div>
                            {project && (
                              <p className="text-muted-foreground truncate text-[10px]">
                                {project.name}
                              </p>
                            )}
                          </div>
                          <span className="text-muted-foreground/80 self-start font-mono text-[10px]">
                            {formatDate(deadline.date)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Timeline */}
          <Card className="bg-card border-border border">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <History className="text-primary h-4.5 w-4.5" />
                <h3 className="text-foreground text-sm font-semibold">Recent Activity</h3>
              </div>

              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-xs">
                  No recent activities recorded in this account yet.
                </p>
              ) : (
                <div className="border-border relative ml-2 space-y-4 border-l py-2 pl-4">
                  {recentActivity.map((activity) => {
                    const project = recentProjects.find((p) => p._id === activity.projectId);

                    let Icon = FileText;
                    let typeLabel = "document";
                    let redirectUrl: string = ROUTES.DOCUMENTS;

                    if (activity.type === "note") {
                      Icon = BookOpen;
                      typeLabel = "note";
                      redirectUrl = activity.projectId
                        ? ROUTES.PROJECT_NOTES(activity.projectId)
                        : ROUTES.PROJECTS;
                    } else if (activity.type === "task") {
                      Icon = CheckSquare;
                      typeLabel = "task";
                      redirectUrl = activity.projectId
                        ? ROUTES.PROJECT_PROGRESS(activity.projectId)
                        : ROUTES.PROJECTS;
                    } else if (activity.type === "document" && activity.projectId) {
                      redirectUrl = ROUTES.PROJECT_DOCUMENTS(activity.projectId);
                    }

                    return (
                      <div key={`${activity.type}-${activity.id}`} className="group relative">
                        {/* Timeline Bullet Icon */}
                        <div className="bg-card border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/40 absolute top-0.5 -left-[25px] flex h-5 w-5 items-center justify-center rounded-full border transition-colors">
                          <Icon className="h-3 w-3" />
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-foreground/80 flex flex-wrap items-center gap-1 text-xs leading-normal">
                            <span className="text-foreground font-semibold capitalize">
                              {typeLabel}
                            </span>
                            <Link
                              href={redirectUrl as any}
                              className="text-primary max-w-[200px] truncate font-medium hover:underline"
                            >
                              &ldquo;{activity.title}&rdquo;
                            </Link>
                            {project && (
                              <span className="text-muted-foreground/60 text-[10px]">
                                in <span className="font-medium">{project.name}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground font-mono text-[10px]">
                            {formatRelativeTime(activity.updatedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right high-priority widget */}
        <div className="space-y-6">
          <Card className="bg-card border-border flex h-full flex-col border">
            <CardContent className="flex flex-1 flex-col justify-between p-4">
              <div className="space-y-4">
                <div className="border-border/30 flex items-center gap-2 border-b pb-3">
                  <ListTodo className="text-primary h-4.5 w-4.5" />
                  <h3 className="text-foreground text-sm font-semibold">High Priority Tasks</h3>
                </div>

                {highPriorityTasks.length === 0 ? (
                  <p className="text-muted-foreground py-12 text-center text-xs">
                    Clear skies! No pending high-priority tasks across active project workspaces.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {highPriorityTasks.map((task) => {
                      const project = recentProjects.find((p) => p._id === task.projectId);

                      return (
                        <Link key={task._id} href={ROUTES.PROJECT_PROGRESS(task.projectId) as any}>
                          <div className="bg-muted/15 border-border hover:border-primary/20 flex flex-col justify-between gap-2 rounded border p-3 text-xs transition-all">
                            <div className="space-y-0.5">
                              <h4 className="text-foreground max-w-[220px] truncate font-semibold">
                                {task.title}
                              </h4>
                              {project && (
                                <p className="text-muted-foreground truncate text-[10px] font-medium">
                                  {project.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <Badge
                                variant="outline"
                                className={`h-4 border border-solid px-1.5 py-0 font-mono text-[9px] font-medium uppercase ${
                                  TASK_STATUS_COLORS[task.status] ||
                                  "text-muted-foreground bg-zinc-500/10"
                                }`}
                              >
                                {TASK_STATUS_LABELS[task.status] || task.status}
                              </Badge>
                              {task.dueDate && (
                                <span className="text-muted-foreground/80 font-mono text-[9px]">
                                  Due: {formatShortDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {highPriorityTasks.length > 0 && (
                <div className="border-border/30 mt-4 border-t pt-4 text-center">
                  <Link
                    href={ROUTES.PROJECTS}
                    className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    <span>Manage Tasks in Projects</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Creator Dialog */}
      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
    </div>
  );
}

// Simple MM-DD format helper since we need it in tasks list
function formatShortDate(date: string) {
  try {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${m}-${day}`;
  } catch {
    return "—";
  }
}
