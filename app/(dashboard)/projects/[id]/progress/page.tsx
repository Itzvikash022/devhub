"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTasksList, useUpdateTask, useDeleteTask, TaskData } from "@/hooks/useTasks";
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
  ChevronDown,
  ChevronUp,
  Edit2,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function ProgressTab() {
  const { id: projectId } = useParams() as { id: string };

  const now = useMemo(() => new Date(), []);

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt-desc");

  // Expandable description state
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Queries & Mutations
  const { data: tasks = [], isLoading, error } = useTasksList(projectId);
  const { mutate: updateTask } = useUpdateTask(projectId);
  const { mutate: deleteTask, isPending: isDeletePending } = useDeleteTask(projectId);

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
    setSelectedTask(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (task: TaskData) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleOpenDelete = (id: string) => {
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

          {/* Tasks Table */}
          <div className="border-border bg-card overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/10 border-b hover:bg-transparent">
                  <TableHead className="w-10 text-center font-mono text-[10px] font-semibold tracking-wider">
                    Done
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                    Task
                  </TableHead>
                  <TableHead className="w-32 font-mono text-[10px] font-semibold tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-32 font-mono text-[10px] font-semibold tracking-wider">
                    Priority
                  </TableHead>
                  <TableHead className="w-36 font-mono text-[10px] font-semibold tracking-wider">
                    Due Date
                  </TableHead>
                  <TableHead className="w-36 font-mono text-[10px] font-semibold tracking-wider">
                    Assignee
                  </TableHead>
                  <TableHead className="w-24 text-right font-mono text-[10px] font-semibold tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
                      <TableRow key={task._id} className="border-border/50 group border-b">
                        {/* Checkbox done toggle */}
                        <TableCell className="py-4 text-center align-top">
                          <input
                            type="checkbox"
                            checked={task.status === "done"}
                            onChange={() => handleToggleDone(task)}
                            className="border-input text-primary focus:ring-ring accent-primary h-4 w-4 cursor-pointer rounded align-middle"
                          />
                        </TableCell>

                        {/* Title and collapsible description */}
                        <TableCell className="py-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {task.description && (
                                <button
                                  onClick={() => toggleExpand(task._id)}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded p-0.5"
                                  title="Toggle description"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              <span
                                onClick={() => handleOpenEdit(task)}
                                className={`hover:text-primary cursor-pointer font-sans text-sm font-medium transition-colors ${
                                  task.status === "done"
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {task.title}
                              </span>

                              {/* Comment bubble indicator */}
                              {task.comments.length > 0 && (
                                <span className="text-muted-foreground bg-muted/65 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px]">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  {task.comments.length}
                                </span>
                              )}
                            </div>

                            {/* Expanded description block */}
                            {isExpanded && task.description && (
                              <p className="text-muted-foreground bg-muted/15 border-border/40 max-w-xl rounded-md border p-2 text-xs leading-relaxed whitespace-pre-wrap">
                                {task.description}
                              </p>
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
                            <span className="text-muted-foreground/40 font-sans text-xs italic">
                              —
                            </span>
                          )}
                        </TableCell>

                        {/* Assignee */}
                        <TableCell className="py-4 align-top font-sans text-xs">
                          {task.assignee ? (
                            <span className="text-foreground font-medium">{task.assignee}</span>
                          ) : (
                            <span className="text-muted-foreground/45 italic">Unassigned</span>
                          )}
                        </TableCell>

                        {/* Action buttons */}
                        <TableCell className="py-3 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(task)}
                              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8"
                              title="Edit task"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(task._id)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Task Creation / Edit Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        task={selectedTask}
      />

      {/* Confirm Deletion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Task"
        description="Are you sure you want to permanently delete this task? Associated calendar event deadlines will also be removed."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />
    </div>
  );
}
