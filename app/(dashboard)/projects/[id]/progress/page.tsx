"use client";

import { useState, useMemo, Fragment } from "react";
import { useParams } from "next/navigation";
import {
  useTasksList,
  useUpdateTask,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckSquare,
  Edit2,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Calendar,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

export default function ProgressTab() {
  const { id: projectId } = useParams() as { id: string };

  const now = useMemo(() => new Date(), []);

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt-desc");

  // Expandable description & comment state
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Queries & Mutations
  const { data: tasks = [], isLoading, error } = useTasksList(projectId);
  const { mutate: updateTask } = useUpdateTask(projectId);
  const { mutate: deleteTask, isPending: isDeletePending } = useDeleteTask(projectId);

  // Derive live selectedTask dynamically from current tasks query array
  const selectedTask = useMemo(() => {
    return tasks.find((t) => t._id === selectedTaskId);
  }, [tasks, selectedTaskId]);

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

  const handleToggleDone = (task: TaskData) => {
    const nextStatus = task.status === "done" ? "todo" : "done";
    updateTask({
      id: task._id,
      data: { status: nextStatus },
    });
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const getPriorityWeight = (priority: string) => {
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
  };

  // Filter & Sort logic
  const filteredAndSortedTasks = tasks
    .filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" ? true : task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" ? true : task.priority === priorityFilter;

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
        case "createdAt-desc":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header controls */}
      <div className="border-border/55 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-foreground text-xl font-semibold">Progress Tracker</h2>
          <p className="text-muted-foreground text-xs">
            Trace tasks, priority milestones, and due deadlines.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-card border-border border">
          <CardContent className="p-0">
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              description="Keep track of what needs to be done. Create your first task to start tracking progress."
              action={{
                label: "Create Task",
                onClick: handleOpenCreate,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-card border-border grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 md:grid-cols-5">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                className="h-9 pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div>
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
            </div>

            {/* Priority Filter */}
            <div>
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
            </div>

            {/* Sorting */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="createdAt-desc">Newest Created</option>
                <option value="dueDate-asc">Due Date (Asc)</option>
                <option value="dueDate-desc">Due Date (Desc)</option>
                <option value="priority-desc">Priority (High to Low)</option>
                <option value="priority-asc">Priority (Low to High)</option>
              </select>
            </div>
          </div>

          {/* Task List Table */}
          <div className="border-border bg-card overflow-x-auto rounded-md border">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/10 border-b hover:bg-transparent">
                  <TableHead className="w-10 text-center font-mono text-[10px] font-semibold tracking-wider">
                    Done
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
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-8 text-center text-xs"
                    >
                      No tasks matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedTasks.map((task) => {
                    const isExpanded = !!expandedTasks[task._id];
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate).getTime() < now.getTime() &&
                      task.status !== "done";

                    return (
                      <Fragment key={task._id}>
                        <TableRow className="border-border/50 group border-b">
                          {/* Checkbox done toggle */}
                          <TableCell className="py-4 text-center align-top">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDone(task);
                              }}
                              className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                                task.status === "done"
                                  ? "bg-[#4F46C7] border-[#4F46C7]"
                                  : "border-[#DAD8CE] hover:border-[#4F46C7] bg-[#EEF0EA]"
                              }`}
                              aria-label={`Mark task as ${task.status === "done" ? "todo" : "done"}`}
                            >
                              {task.status === "done" && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                                  <path
                                    d="M1.5 5l2.5 2.5 4.5-5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </TableCell>

                          {/* Title and collapsible details trigger */}
                          <TableCell className="py-4 align-top whitespace-normal break-words overflow-hidden">
                            <div className="flex items-start gap-2 cursor-pointer select-none group/title" onClick={() => toggleExpand(task._id)}>
                              <span
                                className={`font-sans text-sm font-medium transition-colors break-words whitespace-normal flex-1 ${
                                  task.status === "done"
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground group-hover/title:text-[#4F46C7]"
                                }`}
                              >
                                {task.title}
                              </span>

                              {/* Comment count badge */}
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

                        {/* Full Width Expanded Section (Description + Comments) matching Image 2 mockup */}
                        {isExpanded && (
                          <TableRow className="border-border/50 bg-[#F8F9F5]/30 hover:bg-[#F8F9F5]/30 border-b">
                            <TableCell colSpan={7} className="px-6 py-4 whitespace-normal">
                              <div className="space-y-4 w-full">
                                {/* Description Card */}
                                <div className="bg-[#F8F9F5] border border-[#DAD8CE] rounded-md p-4 space-y-1.5 w-full">
                                  {task.description ? (
                                    <p className="text-[#20221F] font-inter text-xs leading-relaxed break-words whitespace-pre-wrap">
                                      {task.description}
                                    </p>
                                  ) : (
                                    <p className="text-[#6B6E64] font-inter italic text-[11px]">
                                      No description provided.
                                    </p>
                                  )}
                                </div>

                                {/* Comments Card */}
                                <div className="bg-[#F8F9F5] border border-[#DAD8CE] rounded-md p-4 space-y-3 w-full">
                                  <span className="font-mono text-[10px] uppercase text-[#6B6E64] font-semibold tracking-wider block">
                                    Comments ({task.comments.length})
                                  </span>

                                  {task.comments.length > 0 && (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                      {task.comments.map((comment, idx) => (
                                        <div
                                          key={comment._id || idx}
                                          className="bg-[#EEF0EA] border border-[#DAD8CE] rounded p-2.5 text-xs space-y-1"
                                        >
                                          <div className="flex items-center justify-between text-[10px] font-mono text-[#6B6E64]">
                                            <span className="font-medium">{comment.userName || "Team Member"}</span>
                                            <span>
                                              {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                                            </span>
                                          </div>
                                          <p className="font-inter text-xs text-[#20221F] break-words whitespace-pre-wrap">
                                            {comment.text}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Direct Inline Add Comment Form */}
                                  <TaskInlineCommentForm
                                    projectId={projectId}
                                    taskId={task._id}
                                  />
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

      {/* Task Edit / Create Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        task={selectedTask}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />
    </div>
  );
}

/**
 * Small inline comment poster component for expanded task cards
 */
function TaskInlineCommentForm({ projectId, taskId }: { projectId: string; taskId: string }) {
  const [text, setText] = useState("");
  const { mutate: addComment, isPending } = useAddComment(projectId, taskId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(
      { text: text.trim() },
      {
        onSuccess: () => setText(""),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 pt-1">
      <input
        type="text"
        placeholder="Write a comment..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isPending}
        className="flex-1 bg-background border border-[#DAD8CE] rounded px-2.5 py-1 font-inter text-xs text-[#20221F] focus:outline-none focus:border-[#4F46C7]"
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="px-2.5 py-1 rounded bg-[#4F46C7] text-white font-inter text-xs hover:bg-[#4338a8] transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            <Send className="w-3 h-3" /> Post
          </>
        )}
      </button>
    </form>
  );
}
