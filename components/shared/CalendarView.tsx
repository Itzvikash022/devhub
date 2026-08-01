"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCalendarList, useDeleteCalendarEvent, CalendarEventData } from "@/hooks/useCalendar";
import { useProjectsList } from "@/hooks/useProjects";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { CalendarEventDialog } from "@/components/dialogs/CalendarEventDialog";
import { CalendarEventDetailsDialog } from "@/components/dialogs/CalendarEventDetailsDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Loader2, Lock } from "lucide-react";

interface CalendarViewProps {
  projectId?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const colorMap: Record<string, string> = {
  milestone: "bg-[#EBE9F9] text-[#4F46C7] border-[#4F46C7]/30",
  release: "bg-[#EBE9F9] text-[#4F46C7] border-[#4F46C7]/30",
  meeting: "bg-[#3F7A5C]/10 text-[#3F7A5C] border-[#3F7A5C]/30",
  deadline: "bg-[#B14B4B]/10 text-[#B14B4B] border-[#B14B4B]/30",
  personal: "bg-[#B8792E]/10 text-[#B8792E] border-[#B8792E]/30",
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

  useEffect(() => {
    if (dateParam) {
      const d = new Date(dateParam);
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
      }
    }
  }, [dateParam]);

  useEffect(() => {
    if (eventIdParam && events.length > 0) {
      const matched = events.find((e) => e._id === eventIdParam);
      if (matched) {
        setDetailsItem(matched);
        setDetailsOpen(true);
      }
    }
  }, [eventIdParam, events]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Month date grid calculations
  const monthStart = new Date(year, month, 1);
  const startDow = monthStart.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: Date[] = [];
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  // Filter events based on filterProjectId, showProgressEvents, and projectId props
  const filteredEvents = events.filter((ev) => {
    // Progress events toggle filter
    if (!showProgressEvents && ev.source === "task") return false;

    // In project view: strictly filter to current project only
    if (!isGlobalView) {
      return ev.projectId === projectId;
    }

    // In global view: apply project DDL filter
    if (filterProjectId === "all") return true;
    if (filterProjectId === "personal") return !ev.projectId;
    return ev.projectId === filterProjectId;
  });

  // Group events by cell key
  const eventsByDateKey: Record<string, CalendarEventData[]> = {};
  filteredEvents.forEach((ev) => {
    const key = getFormattedDateKey(new Date(ev.date));
    if (!eventsByDateKey[key]) eventsByDateKey[key] = [];
    eventsByDateKey[key].push(ev);
  });

  const handleCellClick = (cellDate: Date) => {
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

  const handleOpenAdd = () => {
    setSelectedDate(undefined);
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto py-12 text-center font-inter text-sm text-[#6B6E64]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4F46C7]" />
        Loading calendar...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1100px] mx-auto py-12 text-center font-inter text-sm text-[#B14B4B]">
        Failed to load calendar events.
      </div>
    );
  }

  const todayKey = getFormattedDateKey(new Date());

  const addButtonNode = (
    <button
      onClick={handleOpenAdd}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46C7] text-white font-inter text-[13px] hover:bg-[#4338a8] transition-colors"
    >
      <Plus className="w-3.5 h-3.5" /> Add event
    </button>
  );

  return (
    <>
      {isGlobalView && <SetPageHeader title="Calendar" actions={addButtonNode} />}

      <div className="max-w-[1100px] mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-md border border-[#DAD8CE] bg-[#F8F9F5] text-[#6B6E64] hover:text-[#20221F] hover:border-[#4F46C7] transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-heading text-[20px] font-medium text-[#20221F] min-w-[180px] text-center">
              {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-md border border-[#DAD8CE] bg-[#F8F9F5] text-[#6B6E64] hover:text-[#20221F] hover:border-[#4F46C7] transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-md border border-[#DAD8CE] bg-[#F8F9F5] font-mono text-[11px] text-[#6B6E64] hover:text-[#20221F] transition-colors"
            >
              Today
            </button>
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Project Selection Dropdown (Global View Only) */}
            {isGlobalView && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                  Project:
                </span>
                <select
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                  className="px-2.5 py-1 bg-[#F8F9F5] border border-[#DAD8CE] font-mono text-[11px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
                >
                  <option value="all">All Projects & Personal</option>
                  <option value="personal">Personal / Unlinked</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Progress Events Toggle Button (Global and Project-Specific) */}
            <button
              onClick={() => setShowProgressEvents((v) => !v)}
              className={`px-2.5 py-1 rounded-md border font-mono text-[11px] uppercase tracking-wide transition-colors ${
                showProgressEvents
                  ? "bg-[#4F46C7] text-white border-[#4F46C7]"
                  : "text-[#6B6E64] border-[#DAD8CE] bg-[#F8F9F5] hover:border-[#4F46C7]"
              }`}
            >
              Progress Events: {showProgressEvents ? "ON" : "OFF"}
            </button>

            {!isGlobalView && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#4F46C7] text-white font-inter text-[12px] hover:bg-[#4338a8] transition-colors ml-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add event
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 font-mono text-[11px] text-[#6B6E64]">
          <span className="flex items-center gap-1.5">
            <span className="text-[#4F46C7] font-bold">◆</span> Task / milestone (auto-generated)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#6B6E64] font-bold">●</span> Manual event
          </span>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-[#DAD8CE]">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64] text-center border-r border-[#DAD8CE] last:border-r-0 bg-[#EEF0EA]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before month start */}
            {Array.from({ length: startDow }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] border-b border-r border-[#DAD8CE] bg-[#EEF0EA]/50 last:border-r-0"
              />
            ))}

            {days.map((day, i) => {
              const dayKey = getFormattedDateKey(day);
              const dayEvents = eventsByDateKey[dayKey] || [];
              const isToday = dayKey === todayKey;
              const col = (startDow + i) % 7;
              const isLastCol = col === 6;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleCellClick(day)}
                  className={`min-h-[100px] border-b border-[#DAD8CE] p-1.5 cursor-pointer hover:bg-[#EEF0EA]/30 transition-colors ${
                    !isLastCol ? "border-r" : ""
                  } ${isToday ? "bg-[#EBE9F9]/40" : ""}`}
                >
                  <div
                    className={`font-mono text-[12px] w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? "bg-[#4F46C7] text-white" : "text-[#6B6E64]"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => {
                      const colorClass =
                        colorMap[event.type] ??
                        "bg-[#EBE9F9] text-[#4F46C7] border-[#4F46C7]/30";
                      return (
                        <button
                          key={event._id}
                          onClick={(e) => handleEventClick(e, event)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-inter border truncate hover:opacity-80 transition-opacity flex items-center justify-between ${colorClass}`}
                        >
                          <span className="truncate">
                            <span className="font-mono mr-1">
                              {event.source !== "manual" ? "◆" : "●"}
                            </span>
                            {event.title}
                          </span>
                          {event.source !== "manual" && (
                            <Lock className="w-2.5 h-2.5 shrink-0 ml-1 opacity-60" />
                          )}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <p className="font-mono text-[10px] text-[#6B6E64] px-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Trailing empty cells */}
            {(() => {
              const totalCells = startDow + days.length;
              const remainder = totalCells % 7;
              if (remainder === 0) return null;
              return Array.from({ length: 7 - remainder }).map((_, i) => (
                <div
                  key={`trail-${i}`}
                  className="min-h-[100px] border-b border-r border-[#DAD8CE] bg-[#EEF0EA]/50 last:border-r-0"
                />
              ));
            })()}
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

        {/* More Events List Modal */}
        {listModalOpen && listModalDate && (
          <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
            <DialogContent className="sm:max-w-md bg-[#F8F9F5] border-[#DAD8CE] rounded-xl">
              <DialogHeader className="border-b border-[#DAD8CE] pb-3">
                <DialogTitle className="font-heading text-base font-medium text-[#20221F]">
                  Events on {formatFormattedDate(listModalDate)}
                </DialogTitle>
              </DialogHeader>

              <div className="max-h-[300px] space-y-2 overflow-y-auto py-2">
                {(eventsByDateKey[getFormattedDateKey(listModalDate)] || []).map((ev) => (
                  <div
                    key={ev._id}
                    onClick={() => {
                      setListModalOpen(false);
                      setDetailsItem(ev);
                      setDetailsOpen(true);
                    }}
                    className="border border-[#DAD8CE] hover:border-[#4F46C7] bg-[#EEF0EA] flex cursor-pointer items-center justify-between gap-3 rounded p-2.5 text-xs font-inter transition-all"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-[#4F46C7]">
                        {ev.source !== "manual" ? "◆" : "●"}
                      </span>
                      <span className="text-[#20221F] truncate">{ev.title}</span>
                    </div>
                    <span className="font-mono text-[10px] uppercase text-[#6B6E64]">
                      {ev.type}
                    </span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}

function formatFormattedDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
