"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDocumentsList, useDeleteDocument, DocumentData } from "@/hooks/useDocuments";
import { useProjectsList } from "@/hooks/useProjects";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { DocumentUploadDialog } from "@/components/dialogs/DocumentUploadDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  FileText,
  Download,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ROUTES } from "@/constants/routes.constants";

interface DocumentVaultViewProps {
  projectId?: string;
}

const fileTypeColors: Record<string, string> = {
  pdf: "text-[#B14B4B] bg-[#B14B4B]/10",
  md: "text-[#4F46C7] bg-[#EBE9F9]",
  txt: "text-[#6B6E64] bg-[#EEF0EA]",
  docx: "text-[#3F7A5C] bg-[#3F7A5C]/10",
  csv: "text-[#B8792E] bg-[#B8792E]/10",
  png: "text-[#4F46C7] bg-[#EBE9F9]",
  svg: "text-[#3F7A5C] bg-[#3F7A5C]/10",
};

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 KB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function DocumentVaultView({ projectId }: DocumentVaultViewProps) {
  const isGlobalView = !projectId;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

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

  const fileTypes = Array.from(
    new Set(documents.map((d) => d.fileType?.toLowerCase().replace(".", "") || "txt"))
  );

  const filteredDocs = documents.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    const itemExt = item.fileType?.toLowerCase().replace(".", "") || "txt";
    const matchesType = filterType === "all" ? true : itemExt === filterType;

    const matchesProject =
      filterProject === "all"
        ? true
        : filterProject === "unlinked"
        ? !item.projectId
        : item.projectId === filterProject;

    return matchesSearch && matchesType && matchesProject;
  });

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto py-12 text-center font-inter text-sm text-[#6B6E64]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4F46C7]" />
        Loading documents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1100px] mx-auto py-12 text-center font-inter text-sm text-[#B14B4B]">
        Failed to load document vault list.
      </div>
    );
  }

  return (
    <>
      {isGlobalView && <SetPageHeader title="Document Vault" />}

      <div className="max-w-[1100px] mx-auto">
        {/* Filters Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B6E64] shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#6B6E64] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
            />
          </div>

          {/* Project Filter (Global view only) */}
          {isGlobalView && (
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-2.5 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
            >
              <option value="all">All projects</option>
              <option value="unlinked">Unlinked (—)</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
          >
            <option value="all">All types</option>
            {fileTypes.map((t) => (
              <option key={t} value={t}>
                .{t}
              </option>
            ))}
          </select>

          {/* Document count beside filters */}
          <span className="font-mono text-[11px] text-[#6B6E64] shrink-0">
            {filteredDocs.length} documents
          </span>

          {/* Add Document button at far right corner */}
          <button
            onClick={handleOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46C7] text-white font-inter text-[13px] hover:bg-[#4338a8] transition-colors ml-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add document
          </button>
        </div>

        {/* Documents Table or Empty State */}
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-lg border border-[#DAD8CE] bg-[#F8F9F5]">
            <FileText className="w-10 h-10 text-[#DAD8CE] mb-3" />
            <p className="font-heading text-xl text-[#20221F] mb-1">No documents found</p>
            <p className="font-inter text-[13px] text-[#6B6E64] mb-4">
              Try adjusting your filters or upload a new document.
            </p>
            <button
              onClick={handleOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46C7] text-white font-inter text-[13px] hover:bg-[#4338a8] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add document
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] overflow-hidden">
            <table className="w-full min-w-[600px]">
              <thead className="bg-[#EEF0EA] border-b border-[#DAD8CE]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Title
                  </th>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Type
                  </th>
                  {isGlobalView && (
                    <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                      Project
                    </th>
                  )}
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Size
                  </th>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Uploaded
                  </th>
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64] w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const project = projects.find((p) => p._id === doc.projectId);
                  const ext = doc.fileType?.toLowerCase().replace(".", "") || "txt";
                  const colorClass = fileTypeColors[ext] ?? "text-[#6B6E64] bg-[#EEF0EA]";

                  return (
                    <tr
                      key={doc._id}
                      className="border-b border-[#DAD8CE] last:border-0 hover:bg-[#EEF0EA] transition-colors"
                    >
                      {/* Title */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="font-inter text-[13px] font-medium text-[#20221F] break-all">
                          {doc.title}
                        </p>
                        <p className="font-mono text-[11px] text-[#6B6E64] mt-0.5 break-all">
                          {doc.fileName}
                        </p>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${colorClass}`}
                        >
                          .{ext}
                        </span>
                      </td>

                      {/* Project (Global View) */}
                      {isGlobalView && (
                        <td className="px-4 py-3 font-inter text-[12px] text-[#6B6E64]">
                          {project ? (
                            <Link
                              href={ROUTES.PROJECT_DOCUMENTS(project._id) as any}
                              className="text-[#4F46C7] hover:underline break-all"
                            >
                              {project.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}

                      {/* Size */}
                      <td className="px-4 py-3 font-mono text-[12px] text-[#6B6E64]">
                        {formatBytes(doc.fileSize)}
                      </td>

                      {/* Uploaded Date */}
                      <td className="px-4 py-3 font-mono text-[12px] text-[#6B6E64]">
                        {format(new Date(doc.uploadedAt || doc.createdAt), "yyyy-MM-dd")}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={downloadPendingId === doc._id}
                            className="text-[#6B6E64] hover:text-[#4F46C7] transition-colors p-1"
                            title="Download"
                          >
                            {downloadPendingId === doc._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46C7]" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="text-[#6B6E64] hover:text-[#20221F] transition-colors p-1"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(doc._id)}
                            className="text-[#6B6E64] hover:text-[#B14B4B] transition-colors p-1"
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
          description="Are you sure you want to permanently delete this document from both storage and database? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          loading={isDeletePending}
        />
      </div>
    </>
  );
}
