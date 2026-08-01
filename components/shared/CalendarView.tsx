"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCalendarList, useDeleteCalendarEvent, CalendarEventData } from "@/hooks/useCalendar";
import { useProjectsList } from "@/hooks/useProjects";
import { CalendarEventDialog } from "@/components/dialogs/CalendarEventDialog";
import { CalendarEventDetailsDialog } from "@/components/dialogs/CalendarEventDetailsDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Filter,
  Layers,
  Calendar as CalendarIcon,
  ListChecks,
} from "lucide-react";

interface CalendarViewProps {
  projectId?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TYPE_DOTS: Record<string, string> = {
  personal: "bg-blue-500",
  milestone: "bg-amber-500",
  deadline: "bg-rose-500",
  meeting: "bg-emerald-500",
  release: "bg-purple-500",
};

const TYPE_LABELS: Record<string, string> = {
  personal: "Personal",
  milestone: "Milestone",
  deadline: "Deadline",
  meeting: "Meeting",
  release: "Release",
};

function getFormattedDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const isGlobalView = !projectId;

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Filters state
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [showProgressEvents, setShowProgressEvents] = useState<boolean>(true);

  // Modal control states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<CalendarEventData | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<CalendarEventData | undefined>(undefined);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listModalDate, setListModalDate] = useState<Date | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // TanStack queries
  const { data: events = [], isLoading, error } = useCalendarList(projectId);
  const { data: projects = [] } = useProjectsList();
  const { mutate: deleteEvent, isPending: isDeletePending } = useDeleteCalendarEvent();

  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const eventIdParam = searchParams.get("eventId");

  // Sync currentDate when date parameter changes in URL
  useEffect(() => {
    if (dateParam) {
      const d = new Date(dateParam);
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
      }
    }
  }, [dateParam]);

  // Sync selected event and open details dialog when eventId parameter is in URL
  useEffect(() => {
    if (eventIdParam && events.length > 0) {
      const matched = events.find((e) => e._id === eventIdParam);
      if (matched) {
        setDetailsItem(matched);
        setDetailsOpen(true);
      }
    }
  }, [eventIdParam, events]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month date grid calculations
  const gridCells = useMemo(() => {
    const cells: Date[] = [];
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Padding days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push(new Date(year, month - 1, prevMonthDays - i));
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push(new Date(year, month, i));
    }

    // Padding days from next month
    const remainingSlots = 42 - cells.length; // 6 rows grid
    for (let i = 1; i <= remainingSlots; i++) {
      cells.push(new Date(year, month + 1, i));
    }

    return cells;
  }, [year, month]);

  // Filter events based on selections
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesType = filterType === "all" ? true : ev.type === filterType;
      const matchesSource =
        filterSource === "all"
          ? true
          : filterSource === "manual"
            ? ev.source === "manual"
            : ev.source !== "manual";

      // Hide task-sourced (progress) events if toggle is off
      const matchesProgress = showProgressEvents ? true : ev.source !== "task";

      let matchesProject = true;
      if (isGlobalView) {
        if (filterProjectId !== "all") {
          if (filterProjectId === "none") {
            matchesProject = !ev.projectId;
          } else {
            matchesProject = ev.projectId === filterProjectId;
          }
        }
      }

      return matchesType && matchesSource && matchesProgress && matchesProject;
    });
  }, [events, filterType, filterSource, filterProjectId, showProgressEvents, isGlobalView]);

  // Group events by cell key
  const eventsByDateKey = useMemo(() => {
    const map: Record<string, CalendarEventData[]> = {};
    filteredEvents.forEach((ev) => {
      const key = getFormattedDateKey(new Date(ev.date));
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const handleCellClick = (cellDate: Date) => {
    // Check if cell is in active month
    if (cellDate.getMonth() !== month) return;

    const cellKey = getFormattedDateKey(cellDate);
    const cellEvents = eventsByDateKey[cellKey] || [];

    if (cellEvents.length > 3) {
      setListModalDate(cellDate);
      setListModalOpen(true);
    } else {
      setSelectedDate(cellKey);
      setSelectedItem(undefined);
      setDialogOpen(true);
    }
  };

  const handleEventClick = (e: React.MouseEvent, item: CalendarEventData) => {
    e.stopPropagation();
    setDetailsItem(item);
    setDetailsOpen(true);
  };

  const handleEditClick = (item: CalendarEventData) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    deleteEvent(itemToDelete, {
      onSuccess: () => {
        setDeleteOpen(false);
        setItemToDelete(null);
      },
    });
  };

  const handleOpenUpload = () => {
    setSelectedDate(undefined);
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3">
          <div className="bg-muted h-6 w-36 animate-pulse rounded" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded" />
        </div>
        <div className="bg-muted border-border h-96 animate-pulse rounded-lg border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive py-6 text-center">
        Failed to load calendar scheduling events.
      </div>
    );
  }

  const todayKey = getFormattedDateKey(new Date());

  return (
    <div className="space-y-6">
      {/* Calendar Header Controls */}
      <div className="bg-card border-border flex flex-col justify-between gap-4 rounded-lg border p-4 lg:flex-row lg:items-center">
        {/* Navigation & Display Month */}
        <div className="flex items-center gap-3">
          <h2 className="text-foreground font-heading min-w-[160px] text-lg font-semibold">
            {MONTH_LABELS[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevMonth}
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs font-medium"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextMonth}
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter controls panel */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-muted/40 border-border flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
            <Filter className="text-muted-foreground h-3.5 w-3.5" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-foreground border-none bg-transparent pr-2 text-xs font-medium focus:outline-none"
            >
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-muted/40 border-border flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
            <Layers className="text-muted-foreground h-3.5 w-3.5" />
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="text-foreground border-none bg-transparent pr-2 text-xs font-medium focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual Scheduled</option>
              <option value="auto">Auto Tasks</option>
            </select>
          </div>

          {isGlobalView && (
            <div className="bg-muted/40 border-border flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
              <CalendarIcon className="text-muted-foreground h-3.5 w-3.5" />
              <select
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="text-foreground max-w-[120px] truncate border-none bg-transparent pr-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Projects</option>
                <option value="none">Global Only</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Progress Events Toggle */}
          <button
            onClick={() => setShowProgressEvents((v) => !v)}
            title={showProgressEvents ? "Hide task deadline events" : "Show task deadline events"}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
              showProgressEvents
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/40 border-border text-muted-foreground"
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Progress Events
          </button>

          <Button size="sm" onClick={handleOpenUpload} className="h-8 shrink-0 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Month Grid */}
      <div className="border-border bg-card overflow-hidden rounded-lg border">
        {/* Days of Week Row */}
        <div className="border-border bg-muted/10 grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-muted-foreground py-2.5 text-center font-mono text-[10px] font-bold tracking-wider uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Cells Grid */}
        <div className="divide-border bg-card grid grid-cols-7 grid-rows-6 divide-x divide-y">
          {gridCells.map((cellDate, idx) => {
            const cellKey = getFormattedDateKey(cellDate);
            const cellEvents = eventsByDateKey[cellKey] || [];
            const isCurrentMonth = cellDate.getMonth() === month;
            const isToday = cellKey === todayKey;

            return (
              <div
                key={`${cellKey}-${idx}`}
                onClick={() => handleCellClick(cellDate)}
                className={`group relative flex min-h-[100px] flex-col justify-between p-2 transition-all select-none ${
                  isCurrentMonth
                    ? "bg-card hover:bg-muted/10 cursor-pointer"
                    : "bg-muted/10 text-muted-foreground/30 pointer-events-none"
                }`}
              >
                {/* Day Number Row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-semibold ${
                      isToday
                        ? "bg-primary text-white"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/30"
                    }`}
                  >
                    {cellDate.getDate()}
                  </span>

                  {/* Event Count Badge (Visible on small screens) */}
                  {cellEvents.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-muted/65 h-4 px-1 font-mono text-[8px] md:hidden"
                    >
                      {cellEvents.length}
                    </Badge>
                  )}
                </div>

                {/* Event items container (visible on mid-large displays) */}
                <div className="mt-1.5 hidden flex-1 flex-col justify-start gap-1 md:flex">
                  {cellEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev._id}
                      onClick={(e) => handleEventClick(e, ev)}
                      className="group/item hover:bg-muted bg-card border-border hover:border-primary/20 flex max-w-full items-center justify-between truncate rounded border px-1.5 py-0.5 font-sans text-[9px] font-medium"
                      title={ev.title}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOTS[ev.type] || "bg-zinc-400"}`}
                        />
                        <span className="text-foreground/90 truncate">{ev.title}</span>
                      </div>
                      {ev.source !== "manual" && (
                        <Lock className="text-muted-foreground/50 ml-0.5 h-2 w-2 shrink-0" />
                      )}
                    </div>
                  ))}

                  {/* Over-flow counter */}
                  {cellEvents.length > 3 && (
                    <span className="text-muted-foreground/75 pl-1 font-mono text-[8px] font-semibold">
                      + {cellEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog forms */}
      <CalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultProjectId={projectId}
        defaultDate={selectedDate}
        item={selectedItem}
      />

      {detailsItem && (
        <CalendarEventDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          item={detailsItem}
          onEditClick={handleEditClick}
          onDeleteConfirm={handleDeleteConfirm}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Calendar Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />

      {/* More Events List Dialog Popup */}
      {listModalOpen && listModalDate && (
        <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="border-border/40 flex flex-row items-center justify-between border-b pr-6 pb-3">
              <DialogTitle className="text-sm font-semibold">
                Events on{" "}
                {listModalDate.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </DialogTitle>
              <Button
                size="sm"
                onClick={() => {
                  setListModalOpen(false);
                  setSelectedDate(getFormattedDateKey(listModalDate));
                  setSelectedItem(undefined);
                  setDialogOpen(true);
                }}
                className="h-8 shrink-0 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add Event
              </Button>
            </DialogHeader>

            <div className="no-scrollbar max-h-[300px] space-y-2 overflow-y-auto py-2 pr-1 text-left">
              {(eventsByDateKey[getFormattedDateKey(listModalDate)] || []).map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => {
                    setListModalOpen(false);
                    setDetailsItem(ev);
                    setDetailsOpen(true);
                  }}
                  className="border-border hover:border-primary/20 bg-card hover:bg-muted flex cursor-pointer items-center justify-between gap-3 rounded border p-2.5 text-xs font-medium transition-all"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOTS[ev.type] || "bg-zinc-400"}`}
                    />
                    <span className="text-foreground/90 truncate">{ev.title}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-muted-foreground bg-muted/65 rounded px-1.5 py-0.5 text-[10px] capitalize">
                      {ev.type}
                    </span>
                    {ev.source !== "manual" && (
                      <Lock className="text-muted-foreground/50 h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
