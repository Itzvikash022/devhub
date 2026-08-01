"use client";

import { useParams } from "next/navigation";
import { CalendarView } from "@/components/shared/CalendarView";

export default function ProjectCalendarTab() {
  const { id: projectId } = useParams() as { id: string };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Tab Header */}
      <div className="border-border/55 flex flex-col gap-1 border-b pb-4">
        <h2 className="font-heading text-foreground text-xl font-semibold">Project Calendar</h2>
        <p className="text-muted-foreground text-xs">
          Schedule meetings, map milestones, and review deadlines exclusive to this project
          workspace.
        </p>
      </div>

      {/* Filtered Project Calendar View */}
      <CalendarView projectId={projectId} />
    </div>
  );
}
