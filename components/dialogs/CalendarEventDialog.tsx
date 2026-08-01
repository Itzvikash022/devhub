"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createCalendarEventSchema,
  CreateCalendarEventInput,
  updateCalendarEventSchema,
  UpdateCalendarEventInput,
} from "@/schemas/calendar-event.schema";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  CalendarEventData,
} from "@/hooks/useCalendar";
import { useProjectsList } from "@/hooks/useProjects";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultDate?: string; // YYYY-MM-DD format if clicked from a cell
  item?: CalendarEventData;
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultDate,
  item,
}: CalendarEventDialogProps) {
  const isEdit = !!item;
  const { data: projects = [] } = useProjectsList();

  const { mutateAsync: createEvent, isPending: isCreating } = useCreateCalendarEvent();
  const { mutateAsync: updateEvent, isPending: isUpdating } = useUpdateCalendarEvent();

  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCalendarEventInput>({
    resolver: zodResolver(
      isEdit ? updateCalendarEventSchema : createCalendarEventSchema
    ) as unknown as Resolver<CreateCalendarEventInput>,
    defaultValues: {
      title: "",
      date: new Date(),
      type: "personal",
      projectId: null,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset({
        title: "",
        date: new Date(),
        type: "personal",
        projectId: null,
      });
    }
    onOpenChange(isOpen);
  };

  // Helper to format date object to YYYY-MM-DD
  const formatToDateInputString = (d: Date | string) => {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    if (!dateObj || isNaN(dateObj.getTime())) return "";
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          title: item.title,
          date: formatToDateInputString(item.date) as any,
          type: item.type,
          projectId: item.projectId || null,
        });
      } else {
        const initialDate = defaultDate ? new Date(defaultDate) : new Date();
        reset({
          title: "",
          date: formatToDateInputString(initialDate) as any,
          type: "personal",
          projectId: defaultProjectId || null,
        });
      }
    }
  }, [open, item, defaultProjectId, defaultDate, reset]);

  const onSubmit = async (data: CreateCalendarEventInput) => {
    try {
      if (isEdit && item) {
        const updatePayload: UpdateCalendarEventInput = {
          title: data.title,
          date: data.date,
          type: data.type,
          projectId: data.projectId || null,
        };
        await updateEvent({ id: item._id, data: updatePayload });
      } else {
        await createEvent(data);
      }
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save calendar event.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Calendar Event" : "Schedule Event"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update your event details, date, or project link."
                : "Create a meeting, milestone, deadline, or personal event."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-left">
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="title">Event Title</FieldLabel>
              <Input
                id="title"
                type="text"
                placeholder="e.g. Sync meeting with client"
                disabled={isPending}
                {...register("title")}
              />
              {errors.title?.message && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.date}>
                <FieldLabel htmlFor="date">Event Date</FieldLabel>
                <Input
                  id="date"
                  type="date"
                  readOnly
                  className="bg-muted cursor-not-allowed opacity-80"
                  {...register("date", {
                    setValueAs: (v) => (v ? new Date(v) : null),
                  })}
                />
                {errors.date?.message && <FieldError>{errors.date.message}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="type">Event Type</FieldLabel>
                <select
                  id="type"
                  disabled={isPending}
                  {...register("type")}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="personal">Personal Task</option>
                  <option value="milestone">Milestone</option>
                  <option value="deadline">Deadline</option>
                  <option value="meeting">Meeting</option>
                  <option value="release">Release</option>
                </select>
                {errors.type?.message && <FieldError>{errors.type.message}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errors.projectId}>
              <FieldLabel htmlFor="projectId">Link to Project</FieldLabel>
              <select
                id="projectId"
                disabled={isPending}
                {...register("projectId")}
                className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="">None (Personal/Global Event)</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId?.message && <FieldError>{errors.projectId.message}</FieldError>}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create Event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
