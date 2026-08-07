"use client";

import { CalendarView } from "@/components/shared/CalendarView";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useActiveProject } from "@/components/layout/ActiveProjectContext";

export default function GlobalCalendarPage() {
  const { activeProjectId, activeProject } = useActiveProject();
  usePageTitle(activeProjectId && activeProject ? `${activeProject.name} — Calendar` : "Calendar");
  return (
    <div className="p-6">
      <CalendarView projectId={activeProjectId ?? undefined} />
    </div>
  );
}
