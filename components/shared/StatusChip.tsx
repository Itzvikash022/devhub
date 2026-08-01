"use client";

import { cn } from "@/lib/utils";

type Status = "active" | "on-hold" | "archived" | "todo" | "in-progress" | "blocked" | "done";
type Priority = "low" | "medium" | "high";

const statusConfig: Record<Status, { label: string; dotClass: string }> = {
  active: { label: "active", dotClass: "text-[#3F7A5C]" },
  "on-hold": { label: "on-hold", dotClass: "text-[#B8792E]" },
  archived: { label: "archived", dotClass: "text-[#6B6E64]" },
  todo: { label: "todo", dotClass: "text-[#6B6E64]" },
  "in-progress": { label: "in-progress", dotClass: "text-[#4F46C7]" },
  blocked: { label: "blocked", dotClass: "text-[#B14B4B]" },
  done: { label: "done", dotClass: "text-[#3F7A5C]" },
};

const priorityConfig: Record<Priority, { label: string; dotClass: string; symbol: string }> = {
  low: { label: "low", dotClass: "text-[#6B6E64]", symbol: "◆" },
  medium: { label: "medium", dotClass: "text-[#B8792E]", symbol: "◆" },
  high: { label: "high", dotClass: "text-[#B14B4B]", symbol: "◆" },
};

interface StatusChipProps {
  status: Status;
  className?: string;
}

interface PriorityChipProps {
  priority: Priority;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status] || { label: status, dotClass: "text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] tracking-wide uppercase",
        "text-[#6B6E64]",
        className
      )}
    >
      <span className={cn("text-[8px] leading-none", config.dotClass)}>●</span>
      {config.label}
    </span>
  );
}

export function PriorityChip({ priority, className }: PriorityChipProps) {
  const config = priorityConfig[priority] || { label: priority, dotClass: "text-muted-foreground", symbol: "◆" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] tracking-wide uppercase",
        "text-[#6B6E64]",
        className
      )}
    >
      <span className={cn("text-[8px] leading-none", config.dotClass)}>{config.symbol}</span>
      {config.label}
    </span>
  );
}
