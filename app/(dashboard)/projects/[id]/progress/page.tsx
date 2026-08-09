"use client";

import { useState, useMemo, Fragment } from "react";
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
  const [sortBy, setSortBy] = useState<string>("dueDate-asc");
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);

  // Screenshot preview dialog states
  const [screenshotPreviewSrc, setScreenshotPreviewSrc] = useState<string | null>(null);
  const [screenshotPreviewOpen, setScreenshotPreviewOpen] = useState(false);

  // Expand state
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

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
          matchesAssignee = taskAssigneeId === me.id;
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesAssignee;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "createdAt-desc":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "dueDate-asc":
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          case "dueDate-desc":
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          case "priority-desc":
            return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          case "priority-asc":
            return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
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
    const itemId = task.type === "bug"
      ? `B-${String(task.bugNumber || 0).padStart(4, "0")}`
      : `T-${String(task.bugNumber || 0).padStart(4, "0")}`;
    const text = [
      `${itemId}: ${task.title}`,
      `Type: ${(task.type || "task").toUpperCase()} | Status: ${task.status.toUpperCase()} | Priority: ${task.priority.toUpperCase()}`,
      task.dueDate ? `Due: ${format(new Date(task.dueDate), "MMM d, yyyy")}` : "Due: N/A",
      task.description ? `\n${task.description}` : "",
    ].filter(Boolean).join("\n");
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

  const toggleExpand = (taskId: string) =>
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));

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

          <Button
            size="sm"
            onClick={handleOpenCreateTask}
            className="shrink-0 gap-1.5 h-9 bg-[#4F46C7] hover:bg-[#4F46C7]/90 text-white font-sans text-xs"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateBug}
            className="shrink-0 gap-1.5 h-9 bg-red-600 hover:bg-red-700 text-white font-sans text-xs"
          >
            <Plus className="h-4 w-4" />
            New Bug
          </Button>
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
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="createdAt-desc">Newest Created</option>
              <option value="dueDate-asc">Due Date (Asc)</option>
              <option value="dueDate-desc">Due Date (Desc)</option>
              <option value="priority-desc">Priority (High → Low)</option>
              <option value="priority-asc">Priority (Low → High)</option>
            </select>
            <div className="flex items-center gap-2 md:col-span-1 pl-2">
              <input
                type="checkbox"
                id="assignedToMe"
                checked={assignedToMeOnly}
                onChange={(e) => setAssignedToMeOnly(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="assignedToMe" className="text-xs text-foreground cursor-pointer select-none">
                Assigned to me
              </label>
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
                  <TableHead className="w-24 font-mono text-[10px] font-semibold tracking-wider">
                    ID
                  </TableHead>
                  {/* Title / Summary */}
                  <TableHead className="w-[38%] font-mono text-[10px] font-semibold tracking-wider">
                    Title / Summary
                  </TableHead>
                  <TableHead className="w-28 font-mono text-[10px] font-semibold tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-28 font-mono text-[10px] font-semibold tracking-wider">
                    Priority
                  </TableHead>
                  <TableHead className="w-32 font-mono text-[10px] font-semibold tracking-wider">
                    Due Date
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
                    const isExpanded = !!expandedTasks[task._id];
                    const isChecked = selectedForExport.has(task._id);

                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate).getTime() < now.getTime() &&
                      task.status !== "done";

                    return (
                      <Fragment key={task._id}>
                        <TableRow
                          className={`border-border/50 group border-b transition-colors cursor-pointer ${isChecked ? "bg-primary/5" : ""}`}
                          onClick={() => toggleExpand(task._id)}
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
                                <div className="flex flex-wrap gap-2 text-[9px] text-muted-foreground font-mono">
                                  {task.createdBy && (
                                    <span>Created by: {task.createdBy.name || "Unknown"}</span>
                                  )}
                                  {task.assignedTo && (
                                    <span>• Assigned to: {task.assignedTo.name || "Unknown"}</span>
                                  )}
                                </div>
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

                        {/* Expandable Details */}
                        {isExpanded && (
                          <TableRow className="border-border/50 bg-muted/5 hover:bg-muted/5 border-b" onClick={(e) => e.stopPropagation()}>
                            <TableCell colSpan={7} className="px-6 py-4 whitespace-normal">
                              <div className="space-y-4 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-card border border-border/50 rounded-md p-4 space-y-3 w-full text-xs">
                                    {!task.area && (!task.screenshots || task.screenshots.length === 0) ? (
                                      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                                        <span className="italic">No area module or screenshots provided.</span>
                                      </div>
                                    ) : (
                                      <>
                                        {task.area && (
                                          <div>
                                            <span className="text-muted-foreground block font-mono text-[9px] uppercase tracking-wider">Area / Module</span>
                                            <span className="font-medium text-foreground">{task.area}</span>
                                          </div>
                                        )}
                                        {task.screenshots && task.screenshots.length > 0 && (
                                          <div>
                                            <span className="text-muted-foreground block font-mono text-[9px] uppercase tracking-wider mb-1.5">Screenshots</span>
                                            <div className="grid grid-cols-4 gap-2">
                                              {task.screenshots.map((url, sIdx) => (
                                                <div
                                                  key={sIdx}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setScreenshotPreviewSrc(url);
                                                    setScreenshotPreviewOpen(true);
                                                  }}
                                                  className="border rounded overflow-hidden aspect-video hover:opacity-80 transition-opacity cursor-pointer"
                                                >
                                                  <img src={getDisplayUrl(url)} alt={`Screenshot ${sIdx + 1}`} className="w-full h-full object-cover" />
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  <div className="bg-card border border-border/50 rounded-md p-4 space-y-1.5 w-full">
                                    <span className="text-muted-foreground block font-mono text-[9px] uppercase tracking-wider">Description</span>
                                    {task.description ? (
                                      <p className="text-foreground/80 font-sans text-xs leading-relaxed break-words whitespace-pre-wrap">
                                        {task.description}
                                      </p>
                                    ) : (
                                      <p className="text-muted-foreground italic text-[11px]">
                                        No description provided.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-card border border-border/50 rounded-md p-4 space-y-3 w-full">
                                  <span className="font-mono text-[10px] uppercase text-muted-foreground font-semibold tracking-wider block">
                                    Comments ({task.comments.length})
                                  </span>
                                  {task.comments.length > 0 && (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                      {task.comments.map((comment, idx) => (
                                        <div
                                          key={comment._id || idx}
                                          className="bg-muted/45 border border-border/45 rounded p-2.5 text-xs space-y-1"
                                        >
                                          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                            <span className="font-medium">{comment.createdBy?.name || comment.userName || "Team Member"}</span>
                                            <span>
                                              {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                                            </span>
                                          </div>
                                          <p className="font-sans text-xs text-foreground/80 break-words whitespace-pre-wrap">
                                            {comment.text}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <TaskInlineCommentForm projectId={projectId} taskId={task._id} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
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
