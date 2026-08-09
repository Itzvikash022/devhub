"use client";

import { useState, useMemo, Fragment } from "react";
import { useParams } from "next/navigation";
import {
  useTasksList,
  useDeleteTask,
  TaskData,
} from "@/hooks/useTasks";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskStatusBadge } from "@/components/shared/StatusBadge";
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
  Bug,
  Edit2,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Download,
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
import { cn, getDisplayUrl } from "@/lib/utils";
import { ImagePreviewDialog } from "@/components/dialogs/ImagePreviewDialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCSV(bugs: TaskData[]): string {
  const rows = [
    ["Bug ID", "Title", "Area", "Status", "Priority", "Created At"],
    ...bugs.map((bug) => [
      `BUG-${String(bug.bugNumber).padStart(4, "0")}`,
      bug.title || "Untitled",
      bug.area || "N/A",
      bug.status.toUpperCase(),
      bug.priority.toUpperCase(),
      format(new Date(bug.createdAt), "yyyy-MM-dd HH:mm:ss"),
    ]),
  ];
  return rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
}

function buildMarkdown(bugs: TaskData[]): string {
  return bugs
    .map((bug) => {
      const statusBox = bug.status === "done" ? "[x]" : "[ ]";
      let md = `## BUG-${String(bug.bugNumber).padStart(4, "0")}: ${statusBox} ${bug.title}\n`;
      md += `- **Status:** ${bug.status.toUpperCase()}\n`;
      md += `- **Area:** ${bug.area || "N/A"}\n\n`;
      if (bug.description) md += `### Description\n${bug.description}\n\n`;
      return md + "---\n";
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BugsTab() {
  const { id: projectId } = useParams() as { id: string };

  // Filter / sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todo");
  const [sortBy, setSortBy] = useState<string>("createdAt-desc");

  // Expand state
  const [expandedBugs, setExpandedBugs] = useState<Record<string, boolean>>({});

  // Screenshot preview dialog states
  const [screenshotPreviewSrc, setScreenshotPreviewSrc] = useState<string | null>(null);
  const [screenshotPreviewOpen, setScreenshotPreviewOpen] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bugToDelete, setBugToDelete] = useState<string | null>(null);

  // Queries & Mutations
  const { data: tasks = [], isLoading, error } = useTasksList(projectId);
  const { mutate: deleteBug, isPending: isDeletePending } = useDeleteTask(projectId);

  // Filter tasks to bugs only
  const bugs = useMemo(() => tasks.filter((t) => t.type === "bug"), [tasks]);

  const selectedBug = useMemo(
    () => bugs.find((b) => b._id === selectedTaskId),
    [bugs, selectedTaskId]
  );

  // ── Filtering & Sorting ───────────────────────────────────────────
  const filteredAndSortedBugs = useMemo(() => {
    return bugs
      .filter((bug) => {
        const matchesSearch =
          bug.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (bug.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (bug.area || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || bug.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "bugNumber-asc":
            return (a.bugNumber || 0) - (b.bugNumber || 0);
          case "bugNumber-desc":
            return (b.bugNumber || 0) - (a.bugNumber || 0);
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [bugs, searchQuery, statusFilter, sortBy]);

  // ── Export Actions ────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csv = buildCSV(filteredAndSortedBugs);
    downloadBlob(csv, `bugs-export-${projectId}.csv`, "text/csv;charset=utf-8;");
    toast.success(`Exported ${filteredAndSortedBugs.length} bug(s) as CSV.`);
  };

  const handleExportMarkdown = () => {
    const md = buildMarkdown(filteredAndSortedBugs);
    downloadBlob(md, `bugs-export-${projectId}.md`, "text/markdown;charset=utf-8;");
    toast.success(`Exported ${filteredAndSortedBugs.length} bug(s) as Markdown.`);
  };

  // ── Bug Actions ───────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setSelectedTaskId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (bug: TaskData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedTaskId(bug._id);
    setDialogOpen(true);
  };

  const handleOpenDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBugToDelete(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!bugToDelete) return;
    deleteBug(bugToDelete, {
      onSuccess: () => {
        setDeleteOpen(false);
        setBugToDelete(null);
      },
    });
  };

  const toggleExpand = (bugId: string) =>
    setExpandedBugs((prev) => ({ ...prev, [bugId]: !prev[bugId] }));

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
    return <div className="text-destructive p-6 text-center">Failed to load bugs workspace.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-border/55 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-foreground text-xl font-semibold">Bugs Tracker</h2>
          <p className="text-muted-foreground text-xs">
            Manage and track code defects, areas of impact, and screenshots.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 px-3 border border-border font-sans text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center gap-1.5 bg-muted/40 rounded-md outline-none cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[180px] z-50">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
                <Download className="w-3.5 h-3.5" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMarkdown} className="cursor-pointer gap-2">
                <Download className="w-3.5 h-3.5" />
                Export as Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={handleOpenCreate} className="shrink-0 gap-1.5 h-9 bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4" />
            New Bug
          </Button>
        </div>
      </div>

      {bugs.length === 0 ? (
        <Card className="bg-card border-border border">
          <CardContent className="p-0">
            <EmptyState
              icon={Bug}
              title="No bugs logged"
              description="Everything is running smoothly! Log your first project bug to start tracing issues."
              action={{ label: "Log Bug", onClick: handleOpenCreate }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* ── Filters Bar ──────────────────────────────────────── */}
          <div className="bg-card border-border grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search bugs or areas..."
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
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="bugNumber-desc">Bug ID (Desc)</option>
              <option value="bugNumber-asc">Bug ID (Asc)</option>
              <option value="createdAt-desc">Newest Logged</option>
            </select>
          </div>

          {/* ── Bug Table ────────────────────────────────────────── */}
          <div className="border-border bg-card overflow-x-auto rounded-md border">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/10 border-b hover:bg-transparent">
                  <TableHead className="w-24 font-mono text-[10px] font-semibold tracking-wider">
                    ID
                  </TableHead>
                  <TableHead className="w-[55%] font-mono text-[10px] font-semibold tracking-wider">
                    Bug Title
                  </TableHead>
                  <TableHead className="w-48 font-mono text-[10px] font-semibold tracking-wider">
                    Area / Module
                  </TableHead>
                  <TableHead className="w-28 font-mono text-[10px] font-semibold tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-20 text-right font-mono text-[10px] font-semibold tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedBugs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-xs">
                      No bugs matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedBugs.map((bug) => {
                    const isExpanded = !!expandedBugs[bug._id];
                    const isDone = bug.status === "done";

                    return (
                      <Fragment key={bug._id}>
                        <TableRow
                          className="border-border/50 group border-b transition-colors cursor-pointer"
                          onClick={() => toggleExpand(bug._id)}
                        >
                          {/* ID Column */}
                          <TableCell className="py-4 align-top font-mono text-xs font-semibold text-[#4F46C7]">
                            BUG-{String(bug.bugNumber).padStart(4, "0")}
                          </TableCell>

                          {/* Title Column */}
                          <TableCell className="py-4 align-top whitespace-normal break-words overflow-hidden">
                            <div className="flex items-start gap-2 group/title">
                              <span
                                className={`font-sans text-sm font-medium transition-colors break-words whitespace-normal flex-1 ${
                                  isDone
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground group-hover/title:text-primary"
                                }`}
                              >
                                {bug.title}
                              </span>
                              {bug.comments.length > 0 && (
                                <span className="text-muted-foreground bg-muted/65 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] mt-0.5">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  {bug.comments.length}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Area Column */}
                          <TableCell className="py-4 align-top text-xs text-foreground/80 truncate">
                            {bug.area || "—"}
                          </TableCell>

                          {/* Status Column */}
                          <TableCell className="py-4 align-top">
                            <TaskStatusBadge status={bug.status} />
                          </TableCell>

                          {/* Actions Column */}
                          <TableCell className="py-3 text-right align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleOpenEdit(bug, e)}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
                                title="Edit bug"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleOpenDelete(bug._id, e)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                title="Delete bug"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Details */}
                        {isExpanded && (
                          <TableRow className="border-border/50 bg-muted/5 hover:bg-muted/5 border-b" onClick={(e) => e.stopPropagation()}>
                            <TableCell colSpan={5} className="px-6 py-4 whitespace-normal">
                              <div className="space-y-4 w-full">
                                {/* Bug Info Grid */}
                                <div className="bg-card border border-border/50 rounded-md p-4 space-y-3 w-full text-xs">
                                  {bug.description && (
                                    <div>
                                      <span className="text-muted-foreground block font-mono text-[9px] uppercase tracking-wider">Description</span>
                                      <p className="mt-1 text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                                        {bug.description}
                                      </p>
                                    </div>
                                  )}
                                  {bug.screenshots && bug.screenshots.length > 0 && (
                                    <div>
                                      <span className="text-muted-foreground block font-mono text-[9px] uppercase tracking-wider mb-1.5">Screenshots</span>
                                      <div className="grid grid-cols-4 gap-2">
                                        {bug.screenshots.map((url, sIdx) => (
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
                                </div>

                                {/* Comments Section */}
                                <div className="bg-card border border-border/50 rounded-md p-4 space-y-3 w-full">
                                  <span className="font-mono text-[10px] uppercase text-muted-foreground font-semibold tracking-wider block">
                                    Comments ({bug.comments.length})
                                  </span>
                                  {bug.comments.length > 0 && (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                      {bug.comments.map((comment, idx) => (
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
                                  <BugInlineCommentForm projectId={projectId} taskId={bug._id} />
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
        task={selectedBug}
        defaultType="bug"
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Bug log"
        description="Are you sure you want to delete this bug report? Its screenshot assets will be immediately deleted from storage. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />

      <ImagePreviewDialog
        open={screenshotPreviewOpen}
        onOpenChange={setScreenshotPreviewOpen}
        src={getDisplayUrl(screenshotPreviewSrc || "")}
        name="Screenshot Preview"
      />
    </div>
  );
}

// ── Inline Comment Form ────────────────────────────────────────────────────────

import { useAddComment } from "@/hooks/useTasks";

function BugInlineCommentForm({ projectId, taskId }: { projectId: string; taskId: string }) {
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
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add comment..."
        disabled={isPending}
        className="flex-1 border border-border bg-muted/40 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary disabled:opacity-50"
      />
      <Button
        type="submit"
        size="sm"
        disabled={isPending || !text.trim()}
        className="h-8"
      >
        Comment
      </Button>
    </form>
  );
}
