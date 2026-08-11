"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useTasksList,
  useDeleteTask,
  useUpdateTask,
  useAddComment,
  TaskData,
} from "@/hooks/useTasks";
import { useMe } from "@/hooks/useAuth";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckSquare,
  Square,
  Edit2,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Calendar,
  AlertCircle,
  Send,
  Loader2,
  Download,
  Eye,
  Copy,
  Check,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getDisplayUrl } from "@/lib/utils";
import { ImagePreviewDialog } from "@/components/dialogs/ImagePreviewDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCSV(tasks: TaskData[]): string {
  const rows = [
    ["Item ID", "Title", "Type", "Description", "Status", "Priority", "Due Date", "Comments Count", "Created At"],
    ...tasks.map((task) => [
      task.type === "bug"
        ? `B-${String(task.bugNumber || 0).padStart(4, "0")}`
        : `T-${String(task.bugNumber || 0).padStart(4, "0")}`,
      task.title || "Untitled",
      (task.type || "task").toUpperCase(),
      (task.description || "").replace(/"/g, '""'),
      task.status.toUpperCase(),
      task.priority.toUpperCase(),
      task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "N/A",
      String(task.comments?.length ?? 0),
      format(new Date(task.createdAt), "yyyy-MM-dd HH:mm:ss"),
    ]),
  ];
  return rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
}

function buildMarkdown(tasks: TaskData[]): string {
  return tasks
    .map((task) => {
      const statusBox = task.status === "done" ? "[x]" : "[ ]";
      const dueText = task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "N/A";
      const itemId = task.type === "bug"
        ? `B-${String(task.bugNumber || 0).padStart(4, "0")}`
        : `T-${String(task.bugNumber || 0).padStart(4, "0")}`;
      let md = `## ${itemId}: ${statusBox} ${task.title}\n`;
      md += `- **Type:** ${(task.type || "task").toUpperCase()}\n`;
      md += `- **Status:** ${task.status.toUpperCase()}\n`;
      md += `- **Priority:** ${task.priority.toUpperCase()}\n`;
      md += `- **Due Date:** ${dueText}\n\n`;
      if (task.description) md += `### Description\n${task.description}\n\n`;
      if (task.comments?.length) {
        md += `### Comments\n`;
        task.comments.forEach((c) => {
          md += `- *Comment* (${format(new Date(c.createdAt), "yyyy-MM-dd HH:mm")}): ${c.text}\n`;
        });
        md += "\n";
      }
      return md + "---\n";
    })
    .join("\n");
}

function buildPreviewText(tasks: TaskData[]): string {
  return tasks
    .map((task) => {
      const statusBox = task.status === "done" ? "✅" : "⬜";
      const dueText = task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date";
      const itemId = task.type === "bug"
        ? `B-${String(task.bugNumber || 0).padStart(4, "0")}`
        : `T-${String(task.bugNumber || 0).padStart(4, "0")}`;
      let text = `${itemId} ${statusBox} ${task.title}\n`;
      text += `   Type: ${task.type || "task"} | Status: ${task.status} | Priority: ${task.priority} | Due: ${dueText}\n`;
      if (task.description?.trim()) text += `   ${task.description.trim()}\n`;
      if (task.comments?.length) {
        text += `   Comments (${task.comments.length})\n`;
      }
      return text;
    })
    .join("\n");
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getPriorityWeight(priority: string): number {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProgressTab() {
  const { id: projectId } = useParams() as { id: string };

  const now = useMemo(() => new Date(), []);

  // Filter / sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todo");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt-desc");
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);

  // Screenshot preview dialog states
  const [screenshotPreviewSrc, setScreenshotPreviewSrc] = useState<string | null>(null);
  const [screenshotPreviewOpen, setScreenshotPreviewOpen] = useState(false);

  // Right sidebar active task state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // ── Export Selection state ────────────────────────────────────────
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaultType, setDialogDefaultType] = useState<"task" | "bug">("task");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: TaskData } | null>(null);

  // Queries & Mutations
  const { data: tasks = [], isLoading, error } = useTasksList(projectId);
  const { mutate: deleteTask, isPending: isDeletePending } = useDeleteTask(projectId);
  const { mutate: updateTask } = useUpdateTask(projectId);
  const { data: me } = useMe();

  const selectedTask = useMemo(
    () => tasks.find((t) => t._id === selectedTaskId),
    [tasks, selectedTaskId]
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t._id === activeTaskId),
    [tasks, activeTaskId]
  );

  // ── Filtering & Sorting ───────────────────────────────────────────
  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.area || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

        let matchesType = true;
        if (typeFilter === "tasks") {
          matchesType = task.type === "task";
        } else if (typeFilter === "bugs") {
          matchesType = task.type === "bug";
        }

        let matchesAssignee = true;
        if (assignedToMeOnly && me) {
          const taskAssigneeId = typeof task.assignedTo === 'object' && task.assignedTo !== null 
            ? (task.assignedTo as any)._id 
            : task.assignedTo;
          matchesAssignee = taskAssigneeId === me.userId;
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesAssignee;
      })
      .sort((a, b) => {
        const [field, direction] = sortBy.split("-");
        const isAsc = direction === "asc";

        switch (field) {
          case "createdAt":
            return isAsc
              ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "dueDate": {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return isAsc
              ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
              : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          }
          case "priority":
            return isAsc
              ? getPriorityWeight(a.priority) - getPriorityWeight(b.priority)
              : getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          case "status":
            return isAsc
              ? a.status.localeCompare(b.status)
              : b.status.localeCompare(a.status);
          case "id":
            return isAsc
              ? (a.bugNumber || 0) - (b.bugNumber || 0)
              : (b.bugNumber || 0) - (a.bugNumber || 0);
          case "title":
            return isAsc
              ? a.title.localeCompare(b.title)
              : b.title.localeCompare(a.title);
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter, typeFilter, sortBy, assignedToMeOnly, me]);

  // Tasks to actually operate on for export (selected subset or all filtered)
  const exportTargets = useMemo(() => {
    if (selectedForExport.size === 0) return filteredAndSortedTasks;
    return filteredAndSortedTasks.filter((t) => selectedForExport.has(t._id));
  }, [filteredAndSortedTasks, selectedForExport]);

  // ── Selection helpers ─────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () =>
    setSelectedForExport(new Set(filteredAndSortedTasks.map((t) => t._id)));

  const clearSelection = () => setSelectedForExport(new Set());

  const isAllSelected =
    filteredAndSortedTasks.length > 0 &&
    filteredAndSortedTasks.every((t) => selectedForExport.has(t._id));

  // ── Export actions ────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csv = buildCSV(exportTargets);
    downloadBlob(csv, `tasks-export-${projectId}.csv`, "text/csv;charset=utf-8;");
    toast.success(`Exported ${exportTargets.length} task(s) as CSV.`);
    clearSelection();
  };

  const handleExportMarkdown = () => {
    const md = buildMarkdown(exportTargets);
    downloadBlob(md, `tasks-export-${projectId}.md`, "text/markdown;charset=utf-8;");
    toast.success(`Exported ${exportTargets.length} task(s) as Markdown.`);
    clearSelection();
  };

  const handleOpenPreview = () => setPreviewOpen(true);

  // ── Task actions ──────────────────────────────────────────────────
  const handleOpenCreateTask = () => {
    setDialogDefaultType("task");
    setSelectedTaskId(null);
    setDialogOpen(true);
  };

  const handleOpenCreateBug = () => {
    setDialogDefaultType("bug");
    setSelectedTaskId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (task: TaskData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedTaskId(task._id);
    setDialogOpen(true);
  };

  // ── Context menu handlers ─────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, task: TaskData) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  };

  const handleContextCopyTask = () => {
    if (!contextMenu) return;
    const task = contextMenu.task;
    const text = [
      task.title,
      task.description || "",
    ].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Task copied to clipboard!"));
    setContextMenu(null);
  };

  const handleContextMarkDone = () => {
    if (!contextMenu) return;
    const task = contextMenu.task;
    if (task.status === "done") {
      toast.info("Task is already marked as done.");
      setContextMenu(null);
      return;
    }
    updateTask(
      { id: task._id, data: { status: "done" } },
      { onSuccess: () => toast.success(`"${task.title}" marked as done!`) }
    );
    setContextMenu(null);
  };

  const handleOpenDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTaskToDelete(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!taskToDelete) return;
    deleteTask(taskToDelete, {
      onSuccess: () => {
        setDeleteOpen(false);
        setTaskToDelete(null);
      },
    });
  };

  // toggleExpand removed (replaced by right sidebar setActiveTaskId)

  const toggleSort = (field: string) => {
    const [activeField, direction] = sortBy.split("-");
    if (activeField === field) {
      setSortBy(`${field}-${direction === "asc" ? "desc" : "asc"}`);
    } else {
      setSortBy(`${field}-asc`);
    }
  };

  const getSortIcon = (field: string) => {
    const [activeField, direction] = sortBy.split("-");
    if (activeField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground/35" />;
    }
    return direction === "asc" ? (
      <ArrowUp className="w-3 h-3 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary" />
    );
  };

  // ── Loading / Error ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between pb-3">
          <div className="bg-muted h-6 w-36 animate-pulse rounded" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded" />
        </div>
        <Card className="bg-card border-border border">
          <CardContent className="space-y-4 py-12">
            <div className="bg-muted h-8 w-full animate-pulse rounded" />
            <div className="bg-muted h-8 w-full animate-pulse rounded" />
            <div className="bg-muted h-8 w-full animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive p-6 text-center">Failed to load tasks workspace.</div>;
  }

  const hasSelection = selectedForExport.size > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-border/55 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-foreground text-xl font-semibold">Progress Tracker</h2>
          <p className="text-muted-foreground text-xs">
            Trace tasks, priority milestones, and due deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 px-3 border border-border font-sans text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center gap-1.5 bg-muted/40 rounded-md outline-none cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Export
              {hasSelection && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0 text-[10px] font-bold leading-4">
                  {selectedForExport.size}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[180px] z-50">
              <DropdownMenuItem onClick={handleOpenPreview} className="cursor-pointer gap-2">
                <Eye className="w-3.5 h-3.5" />
                Preview &amp; Copy
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {hasSelection ? `${selectedForExport.size} selected` : "all"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
                <Download className="w-3.5 h-3.5" />
                Export as CSV
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {hasSelection ? `${selectedForExport.size} selected` : "all"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMarkdown} className="cursor-pointer gap-2">
                <Download className="w-3.5 h-3.5" />
                Export as Markdown
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {hasSelection ? `${selectedForExport.size} selected` : "all"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5 h-9 bg-[#4F46C7] hover:bg-[#4F46C7]/90 text-white font-sans text-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add New
                </Button>
              }
            />
            <DropdownMenuContent className="min-w-[120px] z-50" align="end">
              <DropdownMenuItem onClick={handleOpenCreateTask} className="cursor-pointer gap-2 text-xs">
                <CheckSquare className="w-3.5 h-3.5" />
                New Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenCreateBug} className="cursor-pointer gap-2 text-xs text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                <AlertCircle className="w-3.5 h-3.5" />
                New Bug
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-card border-border border">
          <CardContent className="p-0">
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              description="Keep track of what needs to be done. Create your first task to start tracking progress."
              action={{ label: "Create Task", onClick: handleOpenCreateTask }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* ── Filters Bar ──────────────────────────────────────── */}
          <div className="bg-card border-border grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                className="h-9 pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="ready-for-test">Ready for Test</option>
              <option value="done">Done</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="all">All Items</option>
              <option value="tasks">Tasks Only</option>
              <option value="bugs">Bugs Only</option>
            </select>
            <div className="flex items-center justify-end md:col-span-1">
              <Button
                variant={assignedToMeOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setAssignedToMeOnly(!assignedToMeOnly)}
                className="h-9 w-full text-xs font-sans gap-1.5 cursor-pointer"
              >
                {assignedToMeOnly ? "Assigned to me" : "All Assignees"}
              </Button>
            </div>
          </div>

          {/* ── Selection Action Bar ──────────────────────────────── */}
          {hasSelection && (
            <div className="flex items-center gap-3 px-3 py-2 bg-primary/8 border border-primary/20 rounded-lg">
              <span className="text-xs font-semibold text-primary">
                {selectedForExport.size} item{selectedForExport.size !== 1 ? "s" : ""} selected for export
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground ml-1 flex items-center gap-0.5"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
          )}

          {/* ── Task Table ────────────────────────────────────────── */}
          <div className="border-border bg-card overflow-x-auto rounded-md border">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/10 border-b hover:bg-transparent">
                  {/* Select-all checkbox */}
                  <TableHead className="w-10 text-center">
                    <button
                      onClick={isAllSelected ? clearSelection : selectAll}
                      className="flex items-center justify-center mx-auto"
                      title={isAllSelected ? "Deselect all" : "Select all for export"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : hasSelection ? (
                        <CheckSquare className="h-4 w-4 text-primary/40" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </button>
                  </TableHead>
                  {/* ID Column */}
                  <TableHead
                    onClick={() => toggleSort("id")}
                    className="w-24 font-mono text-[10px] font-semibold tracking-wider cursor-pointer hover:bg-muted/30 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      ID
                      {getSortIcon("id")}
                    </div>
                  </TableHead>
                  {/* Title / Summary */}
                  <TableHead
                    onClick={() => toggleSort("title")}
                    className="w-[38%] font-mono text-[10px] font-semibold tracking-wider cursor-pointer hover:bg-muted/30 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Title / Summary
                      {getSortIcon("title")}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => toggleSort("status")}
                    className="w-28 font-mono text-[10px] font-semibold tracking-wider cursor-pointer hover:bg-muted/30 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => toggleSort("priority")}
                    className="w-28 font-mono text-[10px] font-semibold tracking-wider cursor-pointer hover:bg-muted/30 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Priority
                      {getSortIcon("priority")}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => toggleSort("dueDate")}
                    className="w-32 font-mono text-[10px] font-semibold tracking-wider cursor-pointer hover:bg-muted/30 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Due Date
                      {getSortIcon("dueDate")}
                    </div>
                  </TableHead>
                  <TableHead className="w-20 text-right font-mono text-[10px] font-semibold tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-xs">
                      No items matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedTasks.map((task) => {
                    const isChecked = selectedForExport.has(task._id);

                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate).getTime() < now.getTime() &&
                      task.status !== "done";

                    return (
                      <Fragment key={task._id}>
                        <TableRow
                          className={`border-border/50 group border-b transition-colors cursor-pointer ${isChecked ? "bg-primary/5" : ""}`}
                          onClick={() => setActiveTaskId(task._id)}
                          onContextMenu={(e) => handleContextMenu(e, task)}
                        >
                          {/* Export selection checkbox */}
                          <TableCell className="py-4 text-center align-top" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(task._id);
                              }}
                              className="flex items-center justify-center mx-auto"
                              title={isChecked ? "Deselect for export" : "Select for export"}
                            >
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground/30 hover:text-muted-foreground transition-colors" />
                              )}
                            </button>
                          </TableCell>

                          {/* ID Badge Column */}
                          <TableCell className="py-4 align-top">
                            {task.type === "bug" ? (
                              <span className="font-mono text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900">
                                B-{String(task.bugNumber || 0).padStart(4, "0")}
                              </span>
                            ) : (
                              <span className="font-mono text-[11px] font-semibold text-[#4F46C7] bg-[#4F46C7]/5 px-1.5 py-0.5 rounded border border-[#4F46C7]/15">
                                T-{String(task.bugNumber || 0).padStart(4, "0")}
                              </span>
                            )}
                          </TableCell>

                          {/* Title and expandable trigger */}
                          <TableCell className="py-4 align-top whitespace-normal break-words overflow-hidden">
                            <div className="flex items-start gap-2 group/title">
                              <span
                                className={`font-sans text-sm font-medium transition-colors break-words whitespace-normal flex-1 ${
                                  task.status === "done"
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground group-hover/title:text-primary"
                                }`}
                              >
                                {task.title}
                              </span>
                              <div className="flex flex-col gap-1 items-start mt-1">
                                {task.comments.length > 0 && (
                                  <span className="text-muted-foreground bg-muted/65 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px]">
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    {task.comments.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell className="py-4 align-top">
                            <TaskStatusBadge status={task.status} />
                          </TableCell>

                          {/* Priority Badge */}
                          <TableCell className="py-4 align-top">
                            <PriorityBadge priority={task.priority} />
                          </TableCell>

                          {/* Due Date */}
                          <TableCell className="py-4 align-top whitespace-nowrap">
                            {task.dueDate ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar className={`h-3.5 w-3.5 ${isOverdue ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
                                <span className={`font-sans text-xs ${isOverdue ? "text-destructive font-semibold" : "text-foreground"}`}>
                                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                                </span>
                                {isOverdue && (
                                  <span title="Overdue!">
                                    <AlertCircle className="h-3 w-3 text-destructive" />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 italic text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 text-right align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleOpenEdit(task, e)}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
                                title="Edit item"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleOpenDelete(task._id, e)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                title="Delete item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        task={selectedTask}
        defaultType={dialogDefaultType}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Item"
        description="Are you sure you want to delete this tracker item? This action will permanently remove it and all associated comment history. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />

      <ExportPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        tasks={exportTargets}
      />

      <ImagePreviewDialog
        open={screenshotPreviewOpen}
        onOpenChange={setScreenshotPreviewOpen}
        src={getDisplayUrl(screenshotPreviewSrc || "")}
        name="Screenshot Preview"
      />

      <TaskDetailsSidebar
        task={activeTask}
        open={!!activeTaskId}
        onOpenChange={(open) => {
          if (!open) setActiveTaskId(null);
        }}
        projectId={projectId}
        onScreenshotClick={(url) => {
          setScreenshotPreviewSrc(url);
          setScreenshotPreviewOpen(true);
        }}
      />

      {/* ── Right-click Context Menu ────────────────────────────────── */}
      {contextMenu && (
        <>
          {/* Backdrop to close on click-outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover shadow-lg py-1 text-sm"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted transition-colors"
              onClick={handleContextCopyTask}
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              Copy Task
            </button>
            <button
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                contextMenu.task.status === "done"
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-foreground hover:bg-muted"
              }`}
              onClick={handleContextMarkDone}
              disabled={contextMenu.task.status === "done"}
            >
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              {contextMenu.task.status === "done" ? "Already Done" : "Mark as Done"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Task Details Sidebar ───────────────────────────────────────────────────────

interface TaskDetailsSidebarProps {
  task: TaskData | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onScreenshotClick: (url: string) => void;
}

function TaskDetailsSidebar({
  task,
  open,
  onOpenChange,
  projectId,
  onScreenshotClick,
}: TaskDetailsSidebarProps) {
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask(projectId);
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [areaVal, setAreaVal] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState("");

  // Sync state values when task changes or sidebar opens
  useEffect(() => {
    if (task) {
      setAreaVal(task.area || "");
      setDescVal(task.description || "");
    }
    setIsEditingArea(false);
    setIsEditingDesc(false);
  }, [task]);

  if (!task) return null;

  const handleSaveArea = () => {
    updateTask(
      { id: task._id, data: { area: areaVal } },
      {
        onSuccess: () => {
          setIsEditingArea(false);
          toast.success("Area / Module updated successfully.");
        },
      }
    );
  };

  const handleSaveDesc = () => {
    updateTask(
      { id: task._id, data: { description: descVal } },
      {
        onSuccess: () => {
          setIsEditingDesc(false);
          toast.success("Description updated successfully.");
        },
      }
    );
  };

  const isBug = task.type === "bug";
  const itemId = isBug
    ? `B-${String(task.bugNumber || 0).padStart(4, "0")}`
    : `T-${String(task.bugNumber || 0).padStart(4, "0")}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full h-full flex flex-col p-0 overflow-hidden bg-background border-l border-border shadow-2xl">
        <SheetHeader className="p-6 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            {isBug ? (
              <span className="font-mono text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-2 py-0.5 rounded border border-red-100 dark:border-red-900">
                {itemId}
              </span>
            ) : (
              <span className="font-mono text-[11px] font-semibold text-[#4F46C7] bg-[#4F46C7]/5 px-2 py-0.5 rounded border border-[#4F46C7]/15">
                {itemId}
              </span>
            )}
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <SheetTitle className="text-lg font-semibold text-foreground leading-tight tracking-tight">
            {task.title}
          </SheetTitle>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Area / Module Section */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground block">
              Area / Module
            </label>
            {isEditingArea ? (
              <div className="space-y-2">
                <Input
                  value={areaVal}
                  onChange={(e) => setAreaVal(e.target.value)}
                  placeholder="e.g. Authentication, Billing, Header..."
                  className="h-9 text-xs font-sans text-foreground"
                  disabled={isUpdating}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveArea}
                    disabled={isUpdating}
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-sans"
                  >
                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAreaVal(task.area || "");
                      setIsEditingArea(false);
                    }}
                    disabled={isUpdating}
                    className="h-8 text-xs font-sans"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingArea(true)}
                className="p-3 bg-muted/30 border border-border/55 rounded-md hover:bg-muted/50 transition-colors cursor-pointer text-xs min-h-[38px] flex items-center font-sans"
              >
                {task.area ? (
                  <span className="text-foreground font-medium">{task.area}</span>
                ) : (
                  <span className="text-muted-foreground/60 italic">Click to specify Area / Module</span>
                )}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="space-y-2 mt-4">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground block">
              Description
            </label>
            {isEditingDesc ? (
              <div className="space-y-2">
                <Textarea
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  placeholder="Describe details, goals, or specifications..."
                  className="min-h-[120px] text-xs resize-none font-sans text-foreground"
                  disabled={isUpdating}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDesc}
                    disabled={isUpdating}
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-sans"
                  >
                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDescVal(task.description || "");
                      setIsEditingDesc(false);
                    }}
                    disabled={isUpdating}
                    className="h-8 text-xs font-sans"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDesc(true)}
                className="p-3 bg-muted/30 border border-border/55 rounded-md hover:bg-muted/50 transition-colors cursor-pointer text-xs min-h-[80px] break-words whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans"
              >
                {task.description ? (
                  <span>{task.description}</span>
                ) : (
                  <span className="text-muted-foreground/60 italic">Click to add description...</span>
                )}
              </div>
            )}
          </div>

          {/* Screenshots Section */}
          {task.screenshots && task.screenshots.length > 0 && (
            <div className="space-y-2 mt-4">
              <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground block">
                Screenshots
              </label>
              <div className="grid grid-cols-3 gap-2">
                {task.screenshots.map((url, sIdx) => (
                  <div
                    key={sIdx}
                    onClick={() => onScreenshotClick(url)}
                    className="border border-border rounded overflow-hidden aspect-video hover:opacity-80 transition-opacity cursor-pointer bg-muted/40"
                  >
                    <img
                      src={getDisplayUrl(url)}
                      alt={`Screenshot ${sIdx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t border-border/60 pt-4 mt-6 space-y-4">
            {task.comments.length > 0 && (
              <>
                <span className="font-mono text-xs uppercase text-muted-foreground font-semibold tracking-wider block">
                  Comments ({task.comments.length})
                </span>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {task.comments.map((comment, idx) => (
                    <div
                      key={comment._id || idx}
                      className="bg-muted/35 border border-border/45 rounded p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span className="font-semibold">{comment.createdBy?.name || comment.userName || "Team Member"}</span>
                        <span>
                          {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-foreground/80 break-words whitespace-pre-wrap leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <TaskInlineCommentForm projectId={projectId} taskId={task._id} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Inline Comment Form ────────────────────────────────────────────────────────

function TaskInlineCommentForm({ projectId, taskId }: { projectId: string; taskId: string }) {
  const [text, setText] = useState("");
  const { mutate: addComment, isPending } = useAddComment(projectId, taskId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment({ text: text.trim() }, { onSuccess: () => setText("") });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 pt-1">
      <input
        type="text"
        placeholder="Write a comment..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isPending}
        className="flex-1 bg-background border border-border/50 rounded px-2.5 py-1.5 font-sans text-xs text-foreground focus:outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-sans text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 h-9"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Post</>}
      </button>
    </form>
  );
}

// ── Export Preview Modal Component ────────────────────────────────────────────

interface ExportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: TaskData[];
}

function ExportPreviewModal({ open, onOpenChange, tasks }: ExportPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  const markdownText = useMemo(() => buildPreviewText(tasks), [tasks]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="flex flex-col max-h-[85vh] p-6">
          <DialogHeader className="shrink-0 mb-4">
            <DialogTitle>Export Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border border-border bg-muted/20 p-4 font-mono text-xs whitespace-pre-wrap break-all rounded-lg min-h-[200px] max-h-[450px]">
            {markdownText || "No items to display."}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleCopy} disabled={!markdownText} className="gap-1.5 bg-[#4F46C7] hover:bg-[#4F46C7]/90 text-white">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Text
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
