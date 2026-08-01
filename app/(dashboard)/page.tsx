"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CheckSquare,
  Plus,
  ArrowRight,
  Layers,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboard";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { ROUTES } from "@/constants/routes.constants";
import { StatusChip } from "@/components/shared/StatusChip";
import { Button } from "@/components/ui/button";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { formatRelativeTime } from "@/utils/formatDate";
import { format, formatDistanceToNow } from "date-fns";

// Stable timestamp — computed once at module load, not during render
const NOW = Date.now();

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardData();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Task inline completion mutation
  const { mutate: updateTask } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-6 p-6">
        {/* Header Loading */}
        <div className="space-y-2">
          <div className="bg-muted h-7 w-48 animate-pulse rounded" />
          <div className="bg-muted h-4 w-36 animate-pulse rounded" />
        </div>

        {/* Project Cards Loading */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#F8F9F5] border-[#DAD8CE] h-28 animate-pulse rounded-lg border" />
          ))}
        </div>

        {/* Layout Split Loading */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-[#F8F9F5] border-[#DAD8CE] h-96 animate-pulse rounded-lg border" />
          <div className="space-y-4">
            <div className="bg-[#F8F9F5] border-[#DAD8CE] h-48 animate-pulse rounded-lg border" />
            <div className="bg-[#F8F9F5] border-[#DAD8CE] h-48 animate-pulse rounded-lg border" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-destructive p-6 text-center font-mono text-xs">
        Failed to load dashboard metrics.
      </div>
    );
  }

  const { recentProjects, upcomingDeadlines, highPriorityTasks, recentActivity } = data;

  const handleCreateProjectClick = () => {
    setProjectDialogOpen(true);
  };

  const handleToggleTask = (id: string, currentStatus: string) => {
    const status = currentStatus === "done" ? "todo" : "done";
    updateTask({ id, status });
  };

  function urgencyColor(dueDate: string) {
    const diff = new Date(dueDate).getTime() - NOW;
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0 || days < 3) return "text-[#B14B4B]";
    if (days < 7) return "text-[#B8792E]";
    return "text-[#20221F]";
  }

  function getActivityText(activity: any) {
    const title = `"${activity.title}"`;
    if (activity.type === "note") {
      return `Updated note ${title}`;
    }
    if (activity.type === "task") {
      if (activity.status === "done") {
        return `Marked task ${title} as done`;
      }
      if (activity.status === "in-progress") {
        return `Updated task ${title} to in-progress`;
      }
      return `Updated task ${title}`;
    }
    if (activity.type === "document") {
      return `Uploaded document ${title}`;
    }
    return `Modified ${activity.type} ${title}`;
  }

  const isEmptyState = recentProjects.length === 0;

  if (isEmptyState) {
    return (
      <>
        <SetPageHeader
          title="Dashboard"
          subtitle={format(new Date(), "EEEE, d MMMM yyyy")}
          actions={
            <button
              onClick={handleCreateProjectClick}
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
        <div className="flex-1 flex items-center justify-center p-8 min-h-[80vh]">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#EBE9F9] flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-[#4F46C7]" />
            </div>
            <h2 className="font-heading text-2xl text-[#20221F] mb-2">No projects yet</h2>
            <p className="text-[#6B6E64] font-inter text-sm mb-6">
              Create your first project to start tracking notes, tasks, deployments, and more.
            </p>
            <Button
              onClick={handleCreateProjectClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#4F46C7] text-white font-inter text-sm hover:bg-[#4338a8] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </Button>
            <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SetPageHeader
        title="Dashboard"
        subtitle={format(new Date(), "EEEE, d MMMM yyyy")}
        actions={
          <button
            onClick={handleCreateProjectClick}
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
      <div className="mx-auto max-w-[1280px] space-y-6 p-6">

      {/* Recent Projects Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-[17px] font-medium text-[#20221F]">Recent Projects</h2>
          <Link
            href={ROUTES.PROJECTS}
            className="flex items-center gap-1 font-mono text-[11px] text-[#6B6E64] hover:text-[#4F46C7] transition-colors"
          >
            All projects <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentProjects.map((project) => (
            <Link
              key={project._id}
              href={ROUTES.PROJECT_NOTES(project._id) as any}
              className="block p-4 rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] hover:border-[#4F46C7] transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-heading text-[16px] font-medium text-[#20221F] group-hover:text-[#4F46C7] transition-colors leading-tight">
                  {project.name}
                </h3>
                <StatusChip status={project.status as any} className="shrink-0 ml-2" />
              </div>
              <p className="font-inter text-[12px] text-[#6B6E64] line-clamp-2 mb-3">
                {project.description || "No project description provided."}
              </p>
              <div className="flex items-center gap-4 font-mono text-[11px] text-[#6B6E64]">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {project.noteCount || 0} notes
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  {project.taskCount || 0} tasks
                </span>
                <span className="ml-auto">
                  {formatRelativeTime(project.updatedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bento grid: Activity + Deadlines + High Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Ledger — spans 2 cols */}
        <section className="lg:col-span-2 rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] p-5 text-left">
          <h2 className="font-heading text-[17px] font-medium text-[#20221F] mb-4">Activity</h2>
          <ol className="space-y-0">
            {recentActivity.map((activity, i) => {
              const project = recentProjects.find((p) => p._id === activity.projectId);
              const isLast = i === recentActivity.length - 1;
              const actionText = getActivityText(activity);
              const redirectUrl =
                activity.type === "note"
                  ? activity.projectId
                    ? ROUTES.PROJECT_NOTES(activity.projectId)
                    : ROUTES.PROJECTS
                  : activity.type === "task"
                  ? activity.projectId
                    ? ROUTES.PROJECT_PROGRESS(activity.projectId)
                    : ROUTES.PROJECTS
                  : activity.projectId
                  ? ROUTES.PROJECT_DOCUMENTS(activity.projectId)
                  : ROUTES.DOCUMENTS;

              return (
                <li key={`${activity.type}-${activity.id}`} className="relative flex gap-3 pl-5">
                  {/* Connecting line */}
                  {!isLast && (
                    <span className="absolute left-[7px] top-5 bottom-0 w-px bg-[#DAD8CE]" />
                  )}
                  {/* Commit dot */}
                  <span className="absolute left-0 top-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#EEF0EA] border border-[#DAD8CE] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6B6E64]" />
                  </span>
                  <div className="pb-4 min-w-0 flex-1">
                    <p className="font-inter text-[13px] text-[#20221F] leading-snug">
                      {actionText}
                      {project && (
                        <Link
                          href={redirectUrl as any}
                          className="ml-1 text-[#4F46C7] hover:underline"
                        >
                          — {project.name}
                        </Link>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-[#6B6E64] mt-0.5">
                      {format(new Date(activity.updatedAt), "yyyy-MM-dd HH:mm")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Right column: Deadlines + High Priority */}
        <div className="space-y-4 text-left">
          {/* Upcoming deadlines */}
          <section className="rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] p-5">
            <h2 className="font-heading text-[17px] font-medium text-[#20221F] mb-3">
              Upcoming
            </h2>
            {upcomingDeadlines.length === 0 ? (
              <p className="font-inter text-[13px] text-[#6B6E64]">No upcoming deadlines.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcomingDeadlines.map((event) => {
                  const project = recentProjects.find((p) => p._id === event.projectId);
                  return (
                    <li key={event._id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={
                            (event.projectId
                              ? ROUTES.PROJECT_CALENDAR(event.projectId)
                              : ROUTES.CALENDAR) as any
                          }
                          className="font-inter text-[12px] text-[#20221F] leading-snug hover:underline truncate block"
                        >
                          {event.title}
                        </Link>
                        {project && (
                          <p className="font-mono text-[11px] text-[#6B6E64] truncate">
                            {project.name}
                          </p>
                        )}
                      </div>
                      <span className={`font-mono text-[11px] shrink-0 ${urgencyColor(event.date)}`}>
                        {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* High priority pending */}
          <section className="rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] p-5">
            <h2 className="font-heading text-[17px] font-medium text-[#20221F] mb-3">
              High Priority
            </h2>
            {highPriorityTasks.length === 0 ? (
              <p className="font-inter text-[13px] text-[#6B6E64]">No high-priority tasks.</p>
            ) : (
              <ul className="space-y-3">
                {highPriorityTasks.map((task) => {
                  const isChecked = task.status === "done";
                  return (
                    <li key={task._id} className="flex items-start gap-2">
                      <button
                        onClick={() => handleToggleTask(task._id, task.status)}
                        className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-[#4F46C7] border-[#4F46C7]"
                            : "border-[#DAD8CE] hover:border-[#4F46C7] bg-[#EEF0EA]"
                        }`}
                        aria-label={`Toggle ${task.title}`}
                      >
                        {isChecked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                            <path
                              d="M1.5 5l2.5 2.5 4.5-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`font-inter text-[12px] leading-snug ${
                            isChecked ? "line-through text-[#6B6E64]" : "text-[#20221F]"
                          }`}
                        >
                          {task.title}
                        </p>
                        <StatusChip status={task.status as any} className="mt-0.5" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
    </div>
    </>
  );
}
