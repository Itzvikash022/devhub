"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useTasksList,
  useDeleteTask,
  useAddComment,
  TaskData,
} from "@/hooks/useTasks";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCSV(tasks: TaskData[]): string {
  const rows = [
    ["Title", "Description", "Status", "Priority", "Due Date", "Comments Count", "Created At"],
    ...tasks.map((task) => [
      task.title || "Untitled",
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
  return (
    "# Tasks Export\n\n" +
    tasks
      .map((task, idx) => {
        const statusBox = task.status === "done" ? "[x]" : "[ ]";
        const dueText = task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "N/A";
        let md = `## ${idx + 1}. ${statusBox} ${task.title}\n`;
        md += `- **Status:** ${task.status.toUpperCase()}\n`;
        md += `- **Priority:** ${task.priority.toUpperCase()}\n`;
        md += `- **Due Date:** ${dueText}\n\n`;
        if (task.description) md += `### Description\n${task.description}\n\n`;
        if (task.comments?.length) {
          md += `### Comments\n`;
          task.comments.forEach((c) => {
            md += `- *${c.userName}* (${format(new Date(c.createdAt), "yyyy-MM-dd HH:mm")}): ${c.text}\n`;
          });
          md += "\n";
        }
        return md + "---\n";
      })
      .join("\n")
  );
}

function buildPreviewText(tasks: TaskData[]): string {
  return tasks
    .map((task, idx) => {
      const statusBox = task.status === "done" ? "✅" : "⬜";
      const dueText = task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date";
      let text = `${idx + 1}. ${statusBox} ${task.title}\n`;
      text += `   Status: ${task.status} | Priority: ${task.priority} | Due: ${dueText}\n`;
      if (task.description?.trim()) text += `   ${task.description.trim()}\n`;
      if (task.comments?.length) {
        text += `   Comments (${task.comments.length}):\n`;
        task.comments.forEach((c) => {
          text += `     • ${c.userName}: ${c.text}\n`;
        });
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

// ─── Export Preview Modal ─────────────────────────────────────────────────────

interface ExportPreviewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tasks: TaskData[];
}

function ExportPreviewModal({ open, onOpenChange, tasks }: ExportPreviewProps) {
  const [copied, setCopied] = useState(false);
  const preview = useMemo(() => buildPreviewText(tasks), [tasks]);
  const markdown = useMemo(() => buildMarkdown(tasks), [tasks]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl !w-[92vw] max-h-[88vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/40">
          <div>
            <DialogTitle className="text-sm font-semibold">Export Preview</DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <div className="flex items-center gap-1.5 mr-7">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
              onClick={() => handleCopy(preview)}
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              Copy Plain Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
              onClick={() => handleCopy(markdown)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Markdown
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          {tasks.map((task, idx) => {
            const dueText = task.dueDate
              ? format(new Date(task.dueDate), "MMM d, yyyy")
              : "No due date";
            const isDone = task.status === "done";
            return (
              <div
                key={task._id}
                className="rounded-lg border border-border/50 bg-card p-4 space-y-2"
              >
                {/* Row 1: index + title */}
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5">
                    {idx + 1}.
                  </span>
                  <span
                    className={`text-sm font-semibold ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Row 2: badges */}
                <div className="flex items-center gap-2 flex-wrap pl-5">
                  <TaskStatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {dueText}
                  </span>
                  {task.comments?.length > 0 && (
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {task.comments.length}
                    </span>
                  )}
                </div>

                {/* Description */}
                {task.description?.trim() && (
                  <p className="pl-5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                )}

                {/* Comments */}
                {task.comments?.length > 0 && (
                  <div className="pl-5 space-y-1.5 pt-1 border-t border-border/30">
                    {task.comments.map((c, ci) => (
                      <div key={c._id || ci} className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/80">{c.userName}</span>
                        {" · "}
                        <span>{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
                        <p className="mt-0.5 text-foreground/70">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressTab() {
  const { id: projectId } = useParams() as { id: string };

  const now = useMemo(() => new Date(), []);

  // Filter / sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate-asc");

  // Expand state
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // ── Export Selection state ────────────────────────────────────────
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Queries & Mutations
  const { data: tasks = [], isLoading, error } = useTasksList(projectId);
  const { mutate: deleteTask, isPending: isDeletePending } = useDeleteTask(projectId);

  const selectedTask = useMemo(
    () => tasks.find((t) => t._id === selectedTaskId),
    [tasks, selectedTaskId]
  );

  // ── Filtering & Sorting ───────────────────────────────────────────
  const getPriorityWeight = (p: string) =>
    p === "high" ? 3 : p === "medium" ? 2 : p === "low" ? 1 : 0;

  const filteredAndSortedTasks = tasks
    .filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "dueDate-asc":
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "dueDate-desc":
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
  const handleOpenCreate = () => {
    setSelectedTaskId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (task: TaskData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedTaskId(task._id);
    setDialogOpen(true);
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

          <Button size="sm" onClick={handleOpenCreate} className="shrink-0 gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            New Task
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
              action={{ label: "Create Task", onClick: handleOpenCreate }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* ── Filters Bar ──────────────────────────────────────── */}
          <div className="bg-card border-border grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 md:grid-cols-5">
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
          </div>

          {/* ── Selection Action Bar ──────────────────────────────── */}
          {hasSelection && (
            <div className="flex items-center gap-3 px-3 py-2 bg-primary/8 border border-primary/20 rounded-lg">
              <span className="text-xs font-semibold text-primary">
                {selectedForExport.size} task{selectedForExport.size !== 1 ? "s" : ""} selected for export
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenPreview}
                  className="h-7 text-xs px-2.5 border-border"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview &amp; Copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  className="h-7 text-xs px-2.5 border-border"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleExportMarkdown}
                  className="h-7 text-xs px-2.5 border-border"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Markdown
                </Button>
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
                  <TableHead className="w-[45%] font-mono text-[10px] font-semibold tracking-wider">
                    Task
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
                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-xs">
                      No tasks matching criteria.
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
                          className={`border-border/50 group border-b transition-colors ${isChecked ? "bg-primary/5" : ""}`}
                        >
                          {/* Export selection checkbox */}
                          <TableCell className="py-4 text-center align-top">
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

                          {/* Title and expandable trigger */}
                          <TableCell className="py-4 align-top whitespace-normal break-words overflow-hidden">
                            <div
                              className="flex items-start gap-2 cursor-pointer select-none group/title"
                              onClick={() => toggleExpand(task._id)}
                            >
                              <span
                                className={`font-sans text-sm font-medium transition-colors break-words whitespace-normal flex-1 ${
                                  task.status === "done"
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground group-hover/title:text-primary"
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.comments.length > 0 && (
                                <span className="text-muted-foreground bg-muted/65 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] mt-0.5">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  {task.comments.length}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Status badge */}
                          <TableCell className="py-4 align-top">
                            <TaskStatusBadge status={task.status} />
                          </TableCell>

                          {/* Priority badge */}
                          <TableCell className="py-4 align-top">
                            <PriorityBadge priority={task.priority} />
                          </TableCell>

                          {/* Due Date */}
                          <TableCell className="py-4 align-top">
                            {task.dueDate ? (
                              <span
                                className={`inline-flex items-center gap-1.5 font-mono text-xs ${
                                  isOverdue ? "font-semibold text-red-500" : "text-muted-foreground"
                                }`}
                              >
                                {isOverdue ? (
                                  <AlertCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <Calendar className="h-3.5 w-3.5" />
                                )}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 font-mono text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 text-right align-top">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleOpenEdit(task, e)}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
                                title="Edit task"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleOpenDelete(task._id, e)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                title="Delete task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable description + comments */}
                        {isExpanded && (
                          <TableRow className="border-border/50 bg-muted/5 hover:bg-muted/5 border-b">
                            <TableCell colSpan={6} className="px-6 py-4 whitespace-normal">
                              <div className="space-y-4 w-full">
                                <div className="bg-card border border-border/50 rounded-md p-4 space-y-1.5 w-full">
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
                                <div className="bg-card border border-border/50 rounded-md p-4 space-y-3 w-full">
                                  <span className="font-mono text-[10px] uppercase text-muted-foreground font-semibold tracking-wider block">
                                    Comments ({task.comments.length})
                                  </span>
                                  {task.comments.length > 0 && (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                      {task.comments.map((comment, idx) => (
                                        <div
                                          key={comment._id || idx}
                                          className="bg-muted/40 border border-border/40 rounded p-2.5 text-xs space-y-1"
                                        >
                                          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                            <span className="font-medium">
                                              {comment.userName || "Team Member"}
                                            </span>
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
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />

      <ExportPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        tasks={exportTargets}
      />
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
        className="flex-1 bg-background border border-border/50 rounded px-2.5 py-1 font-sans text-xs text-foreground focus:outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-sans text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Post</>}
      </button>
    </form>
  );
}
