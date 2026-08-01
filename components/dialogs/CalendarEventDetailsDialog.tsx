"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarEventData } from "@/hooks/useCalendar";
import { useProjectsList } from "@/hooks/useProjects";
import { Calendar, Clock, ExternalLink, FolderOpen, Trash2, Edit2, Lock } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes.constants";
import { Badge } from "@/components/ui/badge";

interface CalendarEventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CalendarEventData;
  onEditClick: (item: CalendarEventData) => void;
  onDeleteConfirm: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  personal: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  milestone: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  deadline: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  meeting: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  release: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  personal: "Personal",
  milestone: "Milestone",
  deadline: "Deadline",
  meeting: "Meeting",
  release: "Release",
};

export function CalendarEventDetailsDialog({
  open,
  onOpenChange,
  item,
  onEditClick,
  onDeleteConfirm,
}: CalendarEventDetailsDialogProps) {
  const { data: projects = [] } = useProjectsList();

  if (!item) return null;

  const project = projects.find((p) => p._id === item.projectId);
  const isAutoEvent = item.source !== "manual";

  const handleEdit = () => {
    onEditClick(item);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDeleteConfirm(item._id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="border-border/30 border-b pb-3 text-left">
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant="outline" className={TYPE_COLORS[item.type]}>
              {TYPE_LABELS[item.type] || item.type}
            </Badge>
            {isAutoEvent && (
              <Badge
                variant="outline"
                className="text-muted-foreground border-border bg-zinc-500/10 font-mono text-[9px] uppercase"
              >
                <Lock className="mr-0.5 h-2 w-2" /> Auto-Generated
              </Badge>
            )}
          </div>
          <DialogTitle className="text-foreground text-base font-semibold">
            {item.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1 flex items-center gap-1.5 font-mono text-xs">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(item.date).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground space-y-4 py-3 text-left text-xs">
          {/* Linked Project details */}
          <div className="flex items-start gap-2.5">
            <FolderOpen className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-foreground font-semibold">Associated Project</p>
              {project ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-foreground font-medium">{project.name}</span>
                  <Link
                    href={
                      isAutoEvent
                        ? `${ROUTES.PROJECT_PROGRESS(project._id)}`
                        : `${ROUTES.PROJECT_DETAILS(project._id)}`
                    }
                    className="text-primary inline-flex items-center gap-0.5 hover:underline"
                  >
                    <span>{isAutoEvent ? "View Task Source" : "Go to Project"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="mt-0.5">Global / Personal Workspace (No Project Link)</p>
              )}
            </div>
          </div>

          {/* Sync Source description */}
          <div className="border-border/30 flex items-start gap-2.5 border-t pt-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <p className="text-foreground font-semibold">Scheduling Context</p>
              {isAutoEvent ? (
                <p className="mt-1 leading-relaxed">
                  This deadline was auto-generated from a task. To edit or remove it, navigate to
                  the task list inside the project workspace.
                </p>
              ) : (
                <p className="mt-1 leading-relaxed">
                  This event was manually scheduled and can be updated or deleted directly from the
                  calendar views.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-border/30 gap-2 border-t pt-3">
          {!isAutoEvent ? (
            <>
              <Button type="button" variant="destructive" onClick={handleDelete} className="gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                Delete Event
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleEdit}
                className="bg-muted/65 hover:bg-muted gap-1"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Details
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
