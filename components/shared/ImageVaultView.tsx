/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useImagesList,
  useDeleteImage,
  useBulkDeleteImages,
  useBulkUpdateCategory,
  ImageAssetData,
  ImagesFilters,
} from "@/hooks/useImages";
import { useProjectsList } from "@/hooks/useProjects";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ImageUploadDialog } from "@/components/dialogs/ImageUploadDialog";
import { ImageDecryptDialog } from "@/components/dialogs/ImageDecryptDialog";
import { ImagePreviewDialog } from "@/components/dialogs/ImagePreviewDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Lock,
  Calendar,
  AlertTriangle,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderEdit,
  CheckSquare,
  Square,
  SlidersHorizontal,
  X,
  FileImage,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getDisplayUrl } from "@/lib/utils";

interface ImageVaultViewProps {
  projectId?: string;
}

export function ImageVaultView({ projectId }: ImageVaultViewProps) {
  const now = useMemo(() => new Date(), []);

  // Filter and pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [searchVal, setSearchVal] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Decryption cache
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  // Dialog triggers
  const [uploadOpen, setUploadOpen] = useState(false);
  const [decryptOpen, setDecryptOpen] = useState(false);
  const [decryptImageId, setDecryptImageId] = useState<string | null>(null);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // Bulk dialog triggers
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkTargetCategory, setBulkTargetCategory] = useState<"mockup" | "screenshot" | "architecture" | "asset" | "other">("mockup");

  // Full Image Preview Modal triggers
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewDescription, setPreviewDescription] = useState("");
  const [previewDimensions, setPreviewDimensions] = useState("");
  const [previewSizeStr, setPreviewSizeStr] = useState("");
  const [previewFileType, setPreviewFileType] = useState("");
  const [activePreviewImage, setActivePreviewImage] = useState<ImageAssetData | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setPage(1); // reset to page 1 on search change
    }, 350);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const activeFilters = useMemo<ImagesFilters>(() => {
    return {
      page,
      pageSize,
      search: debouncedSearch || undefined,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      sortBy,
    };
  }, [page, pageSize, debouncedSearch, categoryFilter, sortBy]);

  // Hook calls
  const { data: queryData, isLoading, error } = useImagesList(projectId, activeFilters);
  const { data: projects = [] } = useProjectsList();

  const { mutate: deleteImage, isPending: isDeletePending } = useDeleteImage(projectId || "");
  const { mutateAsync: bulkDeleteImages, isPending: isBulkDeleting } = useBulkDeleteImages();
  const { mutateAsync: bulkUpdateCategory, isPending: isBulkUpdating } = useBulkUpdateCategory();

  // Normalize response for paginated list schema vs backward-compatible list array
  const paginatedData = queryData as any;
  const images = useMemo<ImageAssetData[]>(() => {
    if (!paginatedData) return [];
    return Array.isArray(paginatedData) ? paginatedData : paginatedData.items || [];
  }, [paginatedData]);

  const pagination = useMemo(() => {
    if (!paginatedData || Array.isArray(paginatedData)) {
      return {
        page: 1,
        pageSize: images.length,
        totalCount: images.length,
        totalPages: 1,
      };
    }
    return paginatedData.pagination || { page: 1, pageSize: 30, totalCount: 0, totalPages: 1 };
  }, [paginatedData, images]);

  if (error) {
    return (
      <div className="text-destructive py-6 text-center text-xs font-semibold">
        Failed to load image vault. Please check backend.
      </div>
    );
  }

  const handleOpenUpload = () => {
    setUploadOpen(true);
  };

  const handleOpenDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setImageToDelete(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!imageToDelete) return;
    deleteImage(imageToDelete, {
      onSuccess: () => {
        setDeleteOpen(false);
        setImageToDelete(null);
        setSelectedIds((prev) => prev.filter((id) => id !== imageToDelete));
      },
    });
  };

  // Helper to format byte counts into readable formats
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Single card view flow
  const handleCardClick = async (image: ImageAssetData) => {
    const isCached = !!decryptedCache[image._id];
    setActivePreviewImage(image);

    if (image.isEncrypted && !isCached) {
      setDecryptImageId(image._id);
      setDecryptOpen(true);
    } else {
      const cachedSrc = decryptedCache[image._id];
      const dimensionsStr = image.width && image.height ? `${image.width} × ${image.height}` : "";
      const sizeStr = formatBytes(image.fileSize);

      if (cachedSrc) {
        setPreviewName(image.name);
        setPreviewSrc(cachedSrc);
        setPreviewDescription(image.description || "");
        setPreviewDimensions(dimensionsStr);
        setPreviewSizeStr(sizeStr);
        setPreviewFileType(image.fileType);
        setPreviewOpen(true);
      } else {
        // Fetch signed URL only on-demand
        try {
          toast.loading("Generating preview link...");
          const res = await fetch(`/api/images/${image._id}/url`);
          const json = await res.json();
          toast.dismiss();

          if (json.success) {
            setPreviewName(image.name);
            setPreviewSrc(json.data.downloadUrl);
            setPreviewDescription(image.description || "");
            setPreviewDimensions(dimensionsStr);
            setPreviewSizeStr(sizeStr);
            setPreviewFileType(image.fileType);
            setPreviewOpen(true);
          } else {
            toast.error("Failed to generate original URL.");
          }
        } catch {
          toast.dismiss();
          toast.error("Network error while fetching preview URL.");
        }
      }
    }
  };

  const handleDecrypted = (decryptedData: string) => {
    if (!decryptImageId) return;

    setDecryptedCache((prev) => ({
      ...prev,
      [decryptImageId]: decryptedData,
    }));

    const img = images.find((i) => i._id === decryptImageId);
    if (img) {
      setActivePreviewImage(img);
      const dimensionsStr = img.width && img.height ? `${img.width} × ${img.height}` : "";
      const sizeStr = formatBytes(img.fileSize);

      setPreviewName(img.name);
      setPreviewSrc(decryptedData);
      setPreviewDescription(img.description || "");
      setPreviewDimensions(dimensionsStr);
      setPreviewSizeStr(sizeStr);
      setPreviewFileType(img.fileType);
      setPreviewOpen(true);
    }
    setDecryptImageId(null);
  };

  // Direct download handler from card hover
  const handleDownloadSingle = async (e: React.MouseEvent | undefined, image: ImageAssetData) => {
    if (e) e.stopPropagation();
    const isCached = !!decryptedCache[image._id];

    if (isCached) {
      const cachedSrc = decryptedCache[image._id];
      const a = document.createElement("a");
      a.href = cachedSrc;
      a.download = image.fileName || `${image.name}.png`;
      a.click();
      return;
    }

    if (image.isEncrypted) {
      // Need decryption passphrase first
      setDecryptImageId(image._id);
      setDecryptOpen(true);
      return;
    }

    try {
      toast.loading("Preparing download...");
      const res = await fetch(`/api/images/${image._id}/url?download=true`);
      const json = await res.json();
      toast.dismiss();

      if (json.success) {
        // Direct browser attachment download - 100% immune to CORS!
        const a = document.createElement("a");
        a.href = json.data.downloadUrl;
        a.click();
      } else {
        toast.error("Could not fetch download URL.");
      }
    } catch {
      toast.dismiss();
      toast.error("Download failed due to network error.");
    }
  };

  // Multi-select management
  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = images.map((img) => img._id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Bulk operations implementations
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkDeleteImages(selectedIds);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch {
      // toast error handled by hook
    }
  };

  const handleBulkUpdateCategory = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkUpdateCategory({ ids: selectedIds, category: bulkTargetCategory });
      setSelectedIds([]);
      setBulkCategoryOpen(false);
    } catch {
      // error handled by hook
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;

    toast.info(`Preparing download for ${selectedIds.length} images...`);

    const downloadPromises = selectedIds.map(async (id) => {
      const img = images.find((i) => i._id === id);
      if (!img) return;

      const isCached = !!decryptedCache[id];
      if (isCached) {
        const cachedSrc = decryptedCache[id];
        const a = document.createElement("a");
        a.href = cachedSrc;
        a.download = img.fileName || `${img.name}.png`;
        a.click();
        return;
      }

      if (img.isEncrypted) {
        toast.error(`Cannot batch download encrypted image "${img.name}" without passphrase.`);
        return;
      }

      try {
        const res = await fetch(`/api/images/${id}/url`);
        const json = await res.json();
        if (json.success) {
          const fileRes = await fetch(json.data.downloadUrl);
          const blob = await fileRes.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = img.fileName || `${img.name}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(blobUrl);
        }
      } catch {
        console.error("Batch download failed for item id:", id);
      }
    });

    await Promise.all(downloadPromises);
    toast.success("Batch download triggers queued.");
  };

  return (
    <>
      <SetPageHeader
        title={projectId ? "Project Image Vault" : "Global Image Vault"}
        actions={
          <Button
            onClick={handleOpenUpload}
            className="bg-[#4F46C7] hover:bg-[#4338a8] text-white text-xs gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            Upload Image
          </Button>
        }
      />

      <div className="mx-auto max-w-6xl space-y-4 py-4 px-2">
        {/* Search, Filter, Sort toolbar */}
        <div className="bg-card border-border flex flex-col gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search images by title..."
              className="h-9 pl-9 text-xs"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal("")}
                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="border-input bg-background text-foreground h-9 rounded-md border px-2.5 text-xs focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="mockup">Mockups</option>
              <option value="screenshot">Screenshots</option>
              <option value="architecture">Architecture</option>
              <option value="asset">Design Assets</option>
              <option value="other">Others</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="border-input bg-background text-foreground h-9 rounded-md border px-2.5 text-xs focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="newest">Newest Uploads</option>
              <option value="oldest">Oldest Uploads</option>
              <option value="largest">Largest File Size</option>
              <option value="smallest">Smallest File Size</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>

            {images.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-9 text-xs border-border flex items-center gap-1.5"
              >
                <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Select Page</span>
              </Button>
            )}
          </div>
        </div>

        {/* Floating Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-3 flex items-center gap-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
              <Badge variant="outline" className="h-5 bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 font-mono">
                {selectedIds.length}
              </Badge>
              <span className="text-[11px] font-semibold tracking-wide uppercase">Selected</span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBulkDownload}
                className="h-8 text-[11px] hover:bg-zinc-800 hover:text-zinc-100 gap-1.5 px-2.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBulkCategoryOpen(true)}
                className="h-8 text-[11px] hover:bg-zinc-800 hover:text-zinc-100 gap-1.5 px-2.5"
              >
                <FolderEdit className="h-3.5 w-3.5" />
                <span>Category</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="h-8 text-[11px] hover:bg-red-950/40 text-red-400 hover:text-red-300 gap-1.5 px-2.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </div>

            <button
              onClick={() => setSelectedIds([])}
              className="text-zinc-500 hover:text-zinc-300 ml-1 p-1 hover:bg-zinc-800 rounded-full"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Gallery Content View */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-muted border-border h-56 animate-pulse rounded-lg border" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <Card className="border-border/40 bg-card/10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <EmptyState
                icon={ImageIcon}
                title="Image Vault is empty"
                description="Upload system diagrams, design briefs, UI layouts, or project screenshots."
                action={{
                  label: "Upload Image",
                  onClick: handleOpenUpload,
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {images.map((image) => {
                const isSelected = selectedIds.includes(image._id);
                const isCached = !!decryptedCache[image._id];
                const isExpired =
                  image.expiryDate && new Date(image.expiryDate).getTime() < now.getTime();

                return (
                  <Card
                    key={image._id}
                    onClick={() => handleCardClick(image)}
                    className={`bg-card border-border hover:border-primary/50 group relative flex h-44 cursor-pointer flex-col overflow-hidden border transition-all p-0 py-0 gap-0 ${
                      isSelected ? "ring-2 ring-primary border-primary" : ""
                    }`}
                  >
                    {/* Checkbox Trigger on hover/selection */}
                    <div
                      onClick={(e) => handleToggleSelect(e, image._id)}
                      className={`absolute top-2 left-2 z-20 h-5 w-5 rounded bg-background/90 flex items-center justify-center border border-border/80 shadow-xs hover:border-primary opacity-0 group-hover:opacity-100 transition-opacity ${
                        isSelected ? "opacity-100 border-primary bg-primary text-white" : ""
                      }`}
                    >
                      {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-white" /> : <Square className="h-4.5 w-4.5 text-muted-foreground/30" />}
                    </div>

                    {/* Thumbnail View Container */}
                    <div className="bg-muted/30 border-border/40 relative flex flex-1 items-center justify-center overflow-hidden border-b">
                      {image.isEncrypted && !isCached ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1 bg-zinc-900/80 p-3 text-center text-zinc-100 backdrop-blur-xs">
                          <Lock className="text-primary h-5 w-5 animate-pulse" />
                          <span className="font-mono text-[10px] font-semibold tracking-wider uppercase">
                            Encrypted
                          </span>
                        </div>
                      ) : isCached ? (
                        <img
                          src={decryptedCache[image._id]}
                          alt={image.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : image.thumbnail ? (
                        <img
                          src={getDisplayUrl(image.thumbnail)}
                          alt={image.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        // Fallback Category Placeholder for unencrypted files uploaded before migrations
                        <div className="bg-muted/15 text-muted-foreground group-hover:text-primary absolute inset-0 flex flex-col items-center justify-center transition-all">
                          <FileImage className="mb-1 h-8 w-8 stroke-[1.2] text-muted-foreground/50" />
                          <span className="font-mono text-[9px] tracking-wider uppercase">
                            Old Upload
                          </span>
                        </div>
                      )}

                      {/* Expired Overlay badge */}
                      {isExpired && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge
                            variant="destructive"
                            className="h-4 bg-red-600 px-1 font-mono text-[8px] tracking-wider text-white uppercase"
                          >
                            <AlertTriangle className="mr-0.5 h-2 w-2" />
                            Expired
                          </Badge>
                        </div>
                      )}

                      {!isExpired && image.expiryDate && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge
                            variant="outline"
                            className="bg-background/85 text-muted-foreground border-border h-4 px-1 font-mono text-[8px] backdrop-blur-xs"
                          >
                            <Calendar className="mr-0.5 h-2 w-2" />
                            {new Date(image.expiryDate).toLocaleDateString()}
                          </Badge>
                        </div>
                      )}

                      {/* Quick Action Overlay on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 z-10">
                        <div className="flex gap-1 bg-background/95 border border-border shadow-lg px-2 py-1.5 rounded-lg items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(image);
                            }}
                            className="p-1 hover:bg-muted rounded text-foreground hover:text-primary"
                            title="Preview Image"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDownloadSingle(e, image)}
                            className="p-1 hover:bg-muted rounded text-foreground hover:text-primary"
                            title="Download Image"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenDelete(e, image._id)}
                            className="p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700"
                            title="Delete Image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Metadata Footer */}
                    <CardContent className="flex min-w-0 items-center justify-between px-2.5 py-2 select-none h-9 shrink-0 bg-card border-t border-border/40 text-[11px] font-medium">
                      <span className="text-foreground truncate font-semibold max-w-[70%]" title={image.name}>
                        {image.name}
                      </span>
                      <span className="text-muted-foreground font-mono text-[9px] shrink-0">
                        {formatBytes(image.fileSize)}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="bg-card border-border flex items-center justify-between rounded-lg border p-3 shadow-xs text-xs">
                <span className="text-muted-foreground font-medium">
                  Showing {images.length} of {pagination.totalCount} images
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
                    {[...Array(pagination.totalPages)].map((_, i) => {
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

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Page Size</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="border-input bg-background text-foreground h-8 rounded border px-2 text-xs"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Dialog Component */}
        <ImageUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} projectId={projectId} />

        {/* Decryption Passphrase Dialog Component */}
        {decryptImageId && (
          <ImageDecryptDialog
            open={decryptOpen}
            onOpenChange={setDecryptOpen}
            projectId={projectId || ""}
            imageId={decryptImageId}
            onDecrypted={handleDecrypted}
          />
        )}

        {/* standalone Fullscreen Preview zoom/pan Dialog */}
        <ImagePreviewDialog
          open={previewOpen}
          onOpenChange={(isOpen) => {
            setPreviewOpen(isOpen);
            if (!isOpen) setActivePreviewImage(null);
          }}
          src={previewSrc}
          name={previewName}
          description={previewDescription}
          dimensions={previewDimensions}
          sizeStr={previewSizeStr}
          fileType={previewFileType}
          onDownload={() => {
            if (activePreviewImage) {
              handleDownloadSingle(undefined, activePreviewImage);
            }
          }}
        />

        {/* Delete Confirmation Component */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Image Asset"
          description="Are you sure you want to permanently delete this image asset? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          loading={isDeletePending}
        />

        {/* Bulk Delete Confirmation Component */}
        <ConfirmDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          title="Bulk Delete Images"
          description={`Are you sure you want to permanently delete the ${selectedIds.length} selected images? This action cannot be undone.`}
          confirmLabel="Delete All"
          onConfirm={handleBulkDelete}
          loading={isBulkDeleting}
        />

        {/* Bulk Category Update Dialog Component */}
        <Dialog open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
          <DialogContent className="max-w-md animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle>Update Category in Bulk</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-1.5 text-left">
              <span className="text-xs font-semibold text-muted-foreground">Select new Category Tag for {selectedIds.length} items</span>
              <select
                value={bulkTargetCategory}
                onChange={(e) => setBulkTargetCategory(e.target.value as any)}
                className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-xs focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="mockup">Mockup</option>
                <option value="screenshot">Screenshot</option>
                <option value="architecture">Architecture</option>
                <option value="asset">Design Asset</option>
                <option value="other">Other</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isBulkUpdating}
                onClick={() => setBulkCategoryOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkUpdateCategory}
                disabled={isBulkUpdating}
                className="bg-[#4F46C7] hover:bg-[#4338a8] text-white text-xs h-9"
              >
                {isBulkUpdating ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
