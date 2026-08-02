"use client";

import { CalendarView } from "@/components/shared/CalendarView";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function GlobalCalendarPage() {
  usePageTitle("Calendar");
  return (
    <div className="p-6">
      <CalendarView />
    </div>
  );
}
