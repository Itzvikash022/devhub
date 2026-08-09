"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useDocumentsListPaginated,
  useDeleteDocument,
  useBulkDeleteDocuments,
  DocumentData,
} from "@/hooks/useDocuments";
import { useProjectsList } from "@/hooks/useProjects";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { DocumentUploadDialog } from "@/components/dialogs/DocumentUploadDialog";
import { DocumentPreviewDialog } from "@/components/dialogs/DocumentPreviewDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  FileText,
  Download,
  Plus,
  Search,
  Trash2,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckSquare,
  Square,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ROUTES } from "@/constants/routes.constants";

interface DocumentVaultViewProps {
  projectId?: string;
}

const fileTypeColors: Record<string, string> = {
  pdf: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50",
  md: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/50",
  txt: "text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800",
  docx: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
  doc: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
  csv: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50",
  xlsx: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
  json: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50",
  yaml: "text-cyan-700 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/50",
  yml: "text-cyan-700 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/50",
  log: "text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/50",
  png: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/50",
  svg: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
  jpg: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/50",
  jpeg: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/50",
};

const categoryLabels: Record<string, string> = {
  requirement: "Requirement",
  contract: "Contract",
  specification: "Specification",
  architecture: "Architecture",
  "meeting-report": "Meeting Report",
  research: "Research",
  other: "Other",
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const PAGE_SIZE = 30;

export function DocumentVaultView({ projectId }: DocumentVaultViewProps) {
  const isGlobalView = !projectId;

  // ─── Search & Filter state ───────────────────────────────────────────
  const [searchVal, setSearchVal] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterExtension, setFilterExtension] = useState("all");
  const [filterUploadDate, setFilterUploadDate] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  // ─── Selection state ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ─── Dialog state ────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ─── Preview state ───────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocumentData | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search");

  useEffect(() => {
    if (searchParam) setSearchVal(searchParam);
  }, [searchParam]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [filterCategory, filterExtension, filterUploadDate, filterProject, sortBy]);

  const effectiveProjectId =
    !isGlobalView ? projectId : filterProject !== "all" && filterProject !== "unlinked" ? filterProject : undefined;

  const { data: paginatedData, isLoading, error } = useDocumentsListPaginated(effectiveProjectId, {
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    category: filterCategory === "all" ? undefined : filterCategory,
    extension: filterExtension === "all" ? undefined : filterExtension,
    uploadDate: filterUploadDate === "all" ? undefined : filterUploadDate,
    sortBy,
  });

  const { data: projects = [] } = useProjectsList();
  const { mutate: deleteDoc, isPending: isDeletePending } = useDeleteDocument();
  const { mutate: bulkDelete, isPending: isBulkDeletePending } = useBulkDeleteDocuments();

  const documents = paginatedData?.items ?? [];
  const pagination = {
    totalCount: paginatedData?.totalCount ?? 0,
    totalPages: paginatedData?.totalPages ?? 1,
    page: paginatedData?.page ?? 1,
  };

  // ─── Selection handlers ───────────────────────────────────────────────
  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map((d) => d._id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  // ─── Preview handler ─────────────────────────────────────────────────
  const handlePreview = async (doc: DocumentData) => {
    setPreviewLoading(doc._id);
    try {
      const res = await fetch(`/api/documents/${doc._id}/download`);
      const json = await res.json();
      if (json.success && json.data.downloadUrl) {
        setPreviewDoc(doc);
        setPreviewSrc(json.data.downloadUrl);
        setPreviewOpen(true);
      } else {
        toast.error("Failed to generate preview link.");
      }
    } catch {
      toast.error("Network error while generating preview.");
    } finally {
      setPreviewLoading(null);
    }
  };

  // ─── Download handler ─────────────────────────────────────────────────
  const handleDownload = async (doc: DocumentData) => {
    setDownloadPendingId(doc._id);
    try {
      const res = await fetch(`/api/documents/${doc._id}/download`);
      const json = await res.json();
      if (json.success && json.data.downloadUrl) {
        const a = document.createElement("a");
        a.href = json.data.downloadUrl;
        a.download = doc.fileName;
        a.click();
        toast.success("Download started.");
      } else {
        toast.error("Failed to retrieve download link.");
      }
    } catch {
      toast.error("Network error while generating download link.");
    } finally {
      setDownloadPendingId(null);
    }
  };

  // ─── Preview download handler ──────────────────────────────────────────
  const handlePreviewDownload = () => {
    if (previewDoc) {
      setPreviewOpen(false);
      handleDownload(previewDoc);
    }
  };

  // ─── Bulk download handler ─────────────────────────────────────────────
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    toast.loading("Generating download links...");
    try {
      const res = await fetch("/api/documents/bulk-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      toast.dismiss();
      if (json.success && Array.isArray(json.data)) {
        let triggered = 0;
        for (const { downloadUrl } of json.data) {
          if (downloadUrl) {
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.click();
            triggered++;
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        if (triggered > 0) {
          toast.success(`Started ${triggered} download(s).`);
        }
        clearSelection();
      }
    } catch {
      toast.dismiss();
      toast.error("Failed to generate bulk download links.");
    }
  };

  const handleOpenUpload = () => setDialogOpen(true);
  const handleOpenDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteOpen(true);
  };
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    deleteDoc(itemToDelete, {
      onSuccess: () => {
        setDeleteOpen(false);
        setItemToDelete(null);
      },
    });
  };

  const handleBulkDeleteConfirm = () => {
    bulkDelete(selectedIds, {
      onSuccess: (result) => {
        toast.success(`Deleted ${result.successCount} document(s).`);
        if (result.failedCount > 0) {
          toast.warning(`${result.failedCount} document(s) could not be deleted.`);
        }
        setBulkDeleteOpen(false);
        clearSelection();
      },
      onError: () => {
        toast.error("Bulk deletion failed.");
        setBulkDeleteOpen(false);
      },
    });
  };

  const isAllSelected = documents.length > 0 && selectedIds.length === documents.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Loading documents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load document vault.
      </div>
    );
  }

  return (
    <>
      {isGlobalView && <SetPageHeader title="Document Vault" />}

      <div className="space-y-4">
        {/* ─── Toolbar ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-card border border-border font-sans text-[12px] text-foreground rounded-md h-8 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 bg-card border border-border font-sans text-[12px] text-foreground rounded-md h-8 focus:outline-none focus:border-primary"
          >
            <option value="all">All categories</option>
            <option value="requirement">Requirement</option>
            <option value="contract">Contract</option>
            <option value="specification">Specification</option>
            <option value="architecture">Architecture</option>
            <option value="meeting-report">Meeting Report</option>
            <option value="research">Research</option>
            <option value="other">Other</option>
          </select>

          {/* Extension filter */}
          <select
            value={filterExtension}
            onChange={(e) => setFilterExtension(e.target.value)}
            className="px-2.5 bg-card border border-border font-sans text-[12px] text-foreground rounded-md h-8 focus:outline-none focus:border-primary"
          >
            <option value="all">All types</option>
            {["pdf", "md", "txt", "json", "yaml", "yml", "csv", "docx", "log"].map((ext) => (
              <option key={ext} value={ext}>.{ext}</option>
            ))}
          </select>

          {/* Upload date filter */}
          <select
            value={filterUploadDate}
            onChange={(e) => setFilterUploadDate(e.target.value)}
            className="px-2.5 bg-card border border-border font-sans text-[12px] text-foreground rounded-md h-8 focus:outline-none focus:border-primary"
          >
            <option value="all">Any time</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          {/* Project filter (global view only) */}
          {isGlobalView && (
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-2.5 bg-card border border-border font-sans text-[12px] text-foreground rounded-md h-8 focus:outline-none focus:border-primary"
            >
              <option value="all">All projects</option>
              <option value="unlinked">Unlinked</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 bg-card border border-border font-sans text-[12px] text-foreground rounded-md h-8 focus:outline-none focus:border-primary"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alphabetical">A → Z</option>
            <option value="largest">Largest</option>
            <option value="smallest">Smallest</option>
          </select>

          {/* Count */}
          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
            {pagination.totalCount} docs
          </span>

          <Button
            onClick={handleOpenUpload}
            size="sm"
            className="ml-auto h-8 px-3 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Document
          </Button>
        </div>

        {/* ─── Bulk Selection Bar ──────────────────────────────────────── */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-primary/8 border border-primary/20 rounded-lg">
            <span className="text-xs font-semibold text-primary">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                className="h-7 text-xs px-2.5 font-semibold border-border"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download Selected
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="h-7 text-xs px-2.5 font-semibold border-red-300/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Selected
              </Button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground ml-1"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ─── Table ─────────────────────────────────────────────────── */}
        {documents.length === 0 ? (
          <div className="border border-border/40 bg-card/10 rounded-xl">
            <div className="flex flex-col items-center justify-center py-20">
              <EmptyState
                icon={FileArchive}
                title="Document Vault is empty"
                description="Store requirements, specifications, architecture docs, contracts, research notes, and technical references here."
                action={{ label: "Upload Document", onClick: handleOpenUpload }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
              <table className="w-full min-w-[640px]">
                <thead className="bg-muted/50 border-b border-border/40">
                  <tr>
                    {/* Select-all checkbox */}
                    <th className="w-9 px-3 py-2.5">
                      <button
                        onClick={handleSelectAll}
                        className="h-4.5 w-4.5 flex items-center justify-center"
                        title={isAllSelected ? "Deselect all" : "Select all"}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Document
                    </th>
                    <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Category
                    </th>
                    {isGlobalView && (
                      <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Project
                      </th>
                    )}
                    <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Size
                    </th>
                    <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Uploaded
                    </th>
                    <th className="text-right px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const project = projects.find((p) => p._id === doc.projectId);
                    const ext = doc.extension || doc.fileName?.split(".").pop()?.toLowerCase() || "file";
                    const colorClass = fileTypeColors[ext] ?? "text-muted-foreground bg-muted";
                    const isSelected = selectedIds.includes(doc._id);

                    return (
                      <tr
                        key={doc._id}
                        className={`border-b border-border/40 last:border-0 transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="w-9 px-3 py-3">
                          <button
                            onClick={(e) => handleToggleSelect(e, doc._id)}
                            className="h-4.5 w-4.5 flex items-center justify-center"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/30" />
                            )}
                          </button>
                        </td>

                        {/* Title + filename */}
                        <td className="px-3 py-3 max-w-[260px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold shrink-0 ${colorClass}`}
                            >
                              {ext}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                                {doc.title}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                {doc.fileName}
                                {doc.userId && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[9px]">
                                    By: {doc.userId.name || "Unknown"}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-3">
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded capitalize">
                            {categoryLabels[doc.category] || doc.category}
                          </span>
                        </td>

                        {/* Project (global view) */}
                        {isGlobalView && (
                          <td className="px-3 py-3 text-[12px] text-muted-foreground">
                            {project ? (
                              <Link
                                href={ROUTES.PROJECT_DOCUMENTS(project._id) as any}
                                className="text-primary hover:underline truncate max-w-[120px] inline-block"
                              >
                                {project.name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                        )}

                        {/* Size */}
                        <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                          {formatBytes(doc.fileSize)}
                        </td>

                        {/* Uploaded Date */}
                        <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                          {format(new Date(doc.uploadedAt || doc.createdAt), "yyyy-MM-dd")}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handlePreview(doc)}
                              disabled={previewLoading === doc._id}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                              title="Preview"
                            >
                              {previewLoading === doc._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              disabled={downloadPendingId === doc._id}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                              title="Download"
                            >
                              {downloadPendingId === doc._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => handleOpenDelete(e, doc._id)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── Pagination ─────────────────────────────────────────── */}
            {pagination.totalPages > 1 && (
              <div className="bg-card border-border flex items-center justify-between rounded-lg border p-3 shadow-xs text-xs">
                <span className="text-muted-foreground font-medium">
                  Showing {documents.length} of {pagination.totalCount} documents
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="h-8 text-xs font-semibold px-2.5 border-border"
                  >
                    <ChevronLeft className="h-4 w-4 mr-0.5" /> Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                      const pageIndex = i + 1;
                      const isCurrent = pageIndex === page;
                      return (
                        <Button
                          key={pageIndex}
                          type="button"
                          variant={isCurrent ? "default" : "outline"}
                          size="icon"
                          onClick={() => setPage(pageIndex)}
                          className="h-8 w-8 text-xs font-semibold border-border"
                        >
                          {pageIndex}
                        </Button>
                      );
                    })}
                    {pagination.totalPages > 7 && (
                      <span className="text-muted-foreground px-1">…{pagination.totalPages}</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                    disabled={page === pagination.totalPages}
                    className="h-8 text-xs font-semibold px-2.5 border-border"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Upload Dialog ───────────────────────────────────────────── */}
        <DocumentUploadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultProjectId={projectId}
        />

        {/* ─── Preview Dialog ──────────────────────────────────────────── */}
        {previewDoc && (
          <DocumentPreviewDialog
            open={previewOpen}
            onOpenChange={(open) => {
              setPreviewOpen(open);
              if (!open) setPreviewDoc(null);
            }}
            src={previewSrc}
            name={previewDoc.fileName}
            category={categoryLabels[previewDoc.category] || previewDoc.category}
            sizeStr={formatBytes(previewDoc.fileSize)}
            dateStr={format(new Date(previewDoc.uploadedAt || previewDoc.createdAt), "yyyy-MM-dd")}
            fileType={previewDoc.fileType}
            onDownload={handlePreviewDownload}
          />
        )}

        {/* ─── Single Delete Confirmation ──────────────────────────────── */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Document"
          description="Are you sure you want to permanently delete this document? This removes it from both storage and the database. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          loading={isDeletePending}
        />

        {/* ─── Bulk Delete Confirmation ────────────────────────────────── */}
        <ConfirmDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          title={`Delete ${selectedIds.length} Documents`}
          description={`Are you sure you want to permanently delete ${selectedIds.length} selected document(s)? This action cannot be undone.`}
          confirmLabel="Delete All"
          onConfirm={handleBulkDeleteConfirm}
          loading={isBulkDeletePending}
        />
      </div>
    </>
  );
}
