import { cn } from "@/lib/utils";

// ─── Project Status Chip ───────────────────────────────────────────────────────
// Uses the same dot-style as StatusChip for visual consistency.

type ProjectStatus = "active" | "on-hold" | "archived";

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; dotColor: string }> = {
  active:    { label: "active",   dotColor: "#3F7A5C" },
  "on-hold": { label: "on-hold",  dotColor: "#B8792E" },
  archived:  { label: "archived", dotColor: "#6B6E64" },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = PROJECT_STATUS_CONFIG[status] ?? PROJECT_STATUS_CONFIG.active;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] tracking-wide uppercase",
        className
      )}
      style={{ color: "#6B6E64" }}
    >
      <span style={{ color: config.dotColor, fontSize: "8px", lineHeight: 1 }}>●</span>
      {config.label}
    </span>
  );
}

// ─── Task Status Chip ─────────────────────────────────────────────────────────

type TaskStatus = "todo" | "in-progress" | "blocked" | "done";

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; dotColor: string }> = {
  todo:          { label: "todo",        dotColor: "#6B6E64" },
  "in-progress": { label: "in-progress", dotColor: "#4F46C7" },
  blocked:       { label: "blocked",     dotColor: "#B14B4B" },
  done:          { label: "done",        dotColor: "#3F7A5C" },
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
        "inline-flex items-center gap-1 font-mono text-[11px] tracking-wide uppercase",
        className
      )}
      style={{ color: "#6B6E64" }}
    >
      <span style={{ color: config.dotColor, fontSize: "8px", lineHeight: 1 }}>●</span>
      {config.label}
    </span>
  );
}

// ─── Priority Chip ────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high";

const PRIORITY_CONFIG: Record<Priority, { label: string; dotColor: string }> = {
  low:    { label: "low",    dotColor: "#6B6E64" },
  medium: { label: "medium", dotColor: "#B8792E" },
  high:   { label: "high",   dotColor: "#B14B4B" },
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
        "inline-flex items-center gap-1 font-mono text-[11px] tracking-wide uppercase",
        className
      )}
      style={{ color: "#6B6E64" }}
    >
      <span style={{ color: config.dotColor, fontSize: "8px", lineHeight: 1 }}>◆</span>
      {config.label}
    </span>
  );
}
