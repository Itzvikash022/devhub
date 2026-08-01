import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Project Status ───────────────────────────────────────────────────────────

type ProjectStatus = "active" | "on-hold" | "archived";

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  active: {
    label: "ACTIVE",
    className: "bg-transparent text-emerald-600 border-emerald-200 font-mono text-[10px]",
  },
  "on-hold": {
    label: "ON-HOLD",
    className: "bg-transparent text-amber-600 border-amber-200 font-mono text-[10px]",
  },
  archived: {
    label: "ARCHIVED",
    className: "bg-transparent text-muted-foreground border-border font-mono text-[10px]",
  },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = PROJECT_STATUS_CONFIG[status] ?? PROJECT_STATUS_CONFIG.active;
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 py-0", config.className, className)}>
      + {config.label}
    </Badge>
  );
}

// ─── Task Status ──────────────────────────────────────────────────────────────

type TaskStatus = "todo" | "in-progress" | "blocked" | "done";

const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  todo: {
    label: "TODO",
    dotClass: "bg-zinc-400",
    textClass: "text-zinc-600",
  },
  "in-progress": {
    label: "IN-PROGRESS",
    dotClass: "bg-blue-400",
    textClass: "text-blue-600",
  },
  blocked: {
    label: "BLOCKED",
    dotClass: "bg-red-400",
    textClass: "text-red-600",
  },
  done: {
    label: "DONE",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-600",
  },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = TASK_STATUS_CONFIG[status] ?? TASK_STATUS_CONFIG.todo;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] font-medium tracking-wide uppercase",
        config.textClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high";

const PRIORITY_CONFIG: Record<Priority, { label: string; dotClass: string; textClass: string }> = {
  low: {
    label: "LOW",
    dotClass: "bg-zinc-400",
    textClass: "text-zinc-500",
  },
  medium: {
    label: "MEDIUM",
    dotClass: "bg-amber-400",
    textClass: "text-amber-600",
  },
  high: {
    label: "HIGH",
    dotClass: "bg-red-400",
    textClass: "text-red-600",
  },
};

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] font-medium tracking-wide uppercase",
        config.textClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}
