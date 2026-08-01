"use client";

import { CalendarView } from "@/components/shared/CalendarView";

export default function GlobalCalendarPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Page Header */}
      <div className="border-border/55 flex flex-col gap-1 border-b pb-4">
        <h1 className="font-heading text-foreground text-2xl font-bold">Calendar Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Centralized scheduling view combining manual events, meetings, milestones, and
          auto-generated task deadlines.
        </p>
      </div>

      {/* Global Calendar Monthly Grid */}
      <CalendarView />
    </div>
  );
}
