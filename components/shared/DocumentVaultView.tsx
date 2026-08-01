"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDocumentsList, useDeleteDocument, DocumentData } from "@/hooks/useDocuments";
import { useProjectsList } from "@/hooks/useProjects";
import { EmptyState } from "@/components/shared/EmptyState";
import { DocumentUploadDialog } from "@/components/dialogs/DocumentUploadDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  File,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  Download,
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentVaultViewProps {
  projectId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  requirement: "Requirement",
  contract: "Contract",
  specification: "Specification",
  architecture: "Architecture",
  "meeting-report": "Meeting Report",
  research: "Research Log",
  other: "Other",
};

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar"))
    return FileArchive;
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json") ||
    mimeType.includes("html") ||
    mimeType.includes("css")
  )
    return FileCode;
  return File;
}

export function DocumentVaultView({ projectId }: DocumentVaultViewProps) {
  const isGlobalView = !projectId;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search");

  useEffect(() => {
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParam]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DocumentData | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Track which document is currently generating download link
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null);

  const { data: documents = [], isLoading, error } = useDocumentsList(projectId);
  const { data: projects = [] } = useProjectsList();
  const { mutate: deleteDoc, isPending: isDeletePending } = useDeleteDocument();

  const handleDownload = async (doc: DocumentData) => {
    setDownloadPendingId(doc._id);
    try {
      const res = await fetch(`/api/documents/${doc._id}/download`);
      const json = await res.json();
      if (json.success && json.data.downloadUrl) {
        window.open(json.data.downloadUrl, "_blank");
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

  if (isLoading) {
    return (
      <div className="space-y-6">
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
    return (
      <div className="text-destructive py-6 text-center">
        Failed to load secure document vault list.
      </div>
    );
  }

  const handleOpenUpload = () => {
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: DocumentData) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleOpenDelete = (id: string) => {
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

  const filteredDocs = documents.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === "all" ? true : item.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-card border-border flex flex-col justify-between gap-3 rounded-md border p-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-md">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search documents..."
            className="h-9 pl-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-36 rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <Button size="sm" onClick={handleOpenUpload} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <Card className="bg-card border-border border">
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="No documents uploaded"
              description="Keep specs, architecture briefs, and contracts linked with your project. Upload files securely to R2."
              action={{
                label: "Upload Document",
                onClick: handleOpenUpload,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 bg-muted/10 border-b hover:bg-transparent">
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Document Title
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Filename & Size
                </TableHead>
                {isGlobalView && (
                  <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                    Linked Project
                  </TableHead>
                )}
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Category
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Upload Date
                </TableHead>
                <TableHead className="w-28 text-right font-mono text-[10px] font-semibold tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isGlobalView ? 6 : 5}
                    className="text-muted-foreground py-8 text-center text-xs"
                  >
                    No matching documents.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((item) => {
                  const Icon = getFileIcon(item.fileType);
                  const project = projects.find((p) => p._id === item.projectId);

                  return (
                    <TableRow key={item._id} className="border-border/50 border-b">
                      {/* Title */}
                      <TableCell className="py-4 align-middle">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="bg-primary/5 flex h-8 w-8 shrink-0 items-center justify-center rounded">
                            <Icon className="text-primary h-4 w-4" />
                          </div>
                          <span className="text-foreground max-w-[200px] truncate text-sm font-semibold">
                            {item.title}
                          </span>
                        </div>
                      </TableCell>

                      {/* Filename & size */}
                      <TableCell className="min-w-0 py-4 align-middle">
                        <div className="flex flex-col">
                          <span className="text-foreground max-w-[220px] truncate font-mono text-xs">
                            {item.fileName}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {formatBytes(item.fileSize)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Linked Project (Global page only) */}
                      {isGlobalView && (
                        <TableCell className="py-4 align-middle">
                          {project ? (
                            <Badge
                              variant="outline"
                              className="text-primary border-primary/20 max-w-28 truncate bg-transparent font-mono text-[9px] uppercase"
                            >
                              {project.name}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground border-border bg-transparent font-mono text-[9px] uppercase"
                            >
                              <Lock className="mr-0.5 h-2 w-2" /> Global
                            </Badge>
                          )}
                        </TableCell>
                      )}

                      {/* Category */}
                      <TableCell className="py-4 align-middle">
                        <span className="text-muted-foreground bg-muted/65 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-muted-foreground py-4 align-middle font-mono text-xs">
                        {new Date(item.uploadedAt || item.createdAt).toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={downloadPendingId === item._id}
                            onClick={() => handleDownload(item)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8"
                            title="Download file"
                          >
                            {downloadPendingId === item._id ? (
                              <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8"
                            title="Edit metadata"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(item._id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            title="Delete file"
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
      )}

      {/* Upload/Edit Dialog */}
      <DocumentUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultProjectId={projectId}
        item={selectedItem}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Document"
        description="Are you sure you want to permanently delete this document from both R2 and database? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />
    </div>
  );
}
