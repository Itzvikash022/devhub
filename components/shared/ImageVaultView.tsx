/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import { useImagesList, useDeleteImage, ImageAssetData } from "@/hooks/useImages";
import { useProjectsList } from "@/hooks/useProjects";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ImageUploadDialog } from "@/components/dialogs/ImageUploadDialog";
import { ImageDecryptDialog } from "@/components/dialogs/ImageDecryptDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon, Plus, Trash2, Lock, Calendar, AlertTriangle, Eye, SlidersHorizontal, Search } from "lucide-react";
import { toast } from "sonner";

interface ImageVaultViewProps {
  projectId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Images",
  mockup: "Mockups",
  screenshot: "Screenshots",
  architecture: "Architecture",
  asset: "Design Assets",
  other: "Others",
};

export function ImageVaultView({ projectId }: ImageVaultViewProps) {
  const isGlobalView = !projectId;
  const now = useMemo(() => new Date(), []);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  const [uploadOpen, setUploadOpen] = useState(false);
  const [decryptOpen, setDecryptOpen] = useState(false);
  const [decryptImageId, setDecryptImageId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewDescription, setPreviewDescription] = useState("");

  const { data: images = [], isLoading, error } = useImagesList(projectId);
  const { data: projects = [] } = useProjectsList();
  const { mutate: deleteImage, isPending: isDeletePending } = useDeleteImage(projectId || "");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        <div className="flex items-center justify-between pb-3">
          <div className="bg-muted h-6 w-36 animate-pulse rounded" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted border-border h-44 animate-pulse rounded-lg border" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive py-6 text-center">Failed to load image vault.</div>
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
      },
    });
  };

  const handleCardClick = async (image: ImageAssetData) => {
    const isCached = !!decryptedCache[image._id];

    if (image.isEncrypted && !isCached) {
      setDecryptImageId(image._id);
      setDecryptOpen(true);
    } else {
      const cachedSrc = decryptedCache[image._id];
      if (cachedSrc) {
        setPreviewName(image.name);
        setPreviewSrc(cachedSrc);
        setPreviewDescription(image.description || "");
        setPreviewOpen(true);
      } else {
        try {
          const res = await fetch(`/api/images/${image._id}/url`);
          const json = await res.json();
          if (json.success) {
            setPreviewName(image.name);
            setPreviewSrc(json.data.downloadUrl);
            setPreviewDescription(image.description || "");
            setPreviewOpen(true);
          } else {
            toast.error("Failed to generate view URL.");
          }
        } catch {
          toast.error("Network error while generating view URL.");
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
      setPreviewName(img.name);
      setPreviewSrc(decryptedData);
      setPreviewDescription(img.description || "");
      setPreviewOpen(true);
    }

    setDecryptImageId(null);
  };

  const filteredImages = images.filter((img) => {
    const matchesCategory = activeCategory === "all" ? true : img.category === activeCategory;
    const matchesProject =
      filterProject === "all"
        ? true
        : filterProject === "unlinked"
        ? !img.projectId
        : img.projectId === filterProject;
    const matchesSearch =
      !searchQuery ||
      img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesProject && matchesSearch;
  });

  return (
    <>
      {isGlobalView && <SetPageHeader title="Image Vault" />}

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Filters & Action Bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#DAD8CE] pb-4">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B6E64] shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#6B6E64] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search images..."
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
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter Dropdown / Tabs */}
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="px-2.5 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <span className="font-mono text-[11px] text-[#6B6E64] shrink-0">
            {filteredImages.length} images
          </span>

          <Button size="sm" onClick={handleOpenUpload} className="ml-auto gap-1.5 bg-[#4F46C7] hover:bg-[#4338a8] text-white text-xs h-8">
            <Plus className="h-3.5 w-3.5" />
            Upload Image
          </Button>
        </div>

        {images.length === 0 ? (
          <Card className="bg-card border-border border">
            <CardContent className="p-0">
              <EmptyState
                icon={ImageIcon}
                title="Image Vault is empty"
                description="Keep system diagrams, UI designs, and mockups here."
                action={{
                  label: "Upload Image",
                  onClick: handleOpenUpload,
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Cards Grid */}
            {filteredImages.length === 0 ? (
              <div className="border-border bg-card/25 rounded-lg border border-dashed py-16 text-center">
                <p className="text-muted-foreground text-xs">
                  No images stored matching filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {filteredImages.map((image) => {
                  const isCached = !!decryptedCache[image._id];
                  const isExpired =
                    image.expiryDate && new Date(image.expiryDate).getTime() < now.getTime();

                  return (
                    <Card
                      key={image._id}
                      onClick={() => handleCardClick(image)}
                      className="bg-card border-border hover:border-primary/45 group relative flex h-56 cursor-pointer flex-col overflow-hidden border transition-all"
                    >
                      {/* Thumbnail View Container */}
                      <div className="bg-muted/30 border-border/40 relative flex h-36 items-center justify-center overflow-hidden border-b">
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
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="bg-muted/10 text-muted-foreground group-hover:text-primary absolute inset-0 flex flex-col items-center justify-center transition-all">
                            <ImageIcon className="mb-1 h-8 w-8 stroke-[1.2]" />
                            <span className="font-mono text-[9px] tracking-wider uppercase">
                              View Preview
                            </span>
                          </div>
                        )}

                        {/* Overdue Expired Overlay */}
                        {isExpired && (
                          <div className="absolute top-2 left-2 z-10">
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
                          <div className="absolute top-2 left-2 z-10">
                            <Badge
                              variant="outline"
                              className="bg-background/85 text-muted-foreground border-border h-4 px-1 font-mono text-[8px] backdrop-blur-xs"
                            >
                              <Calendar className="mr-0.5 h-2 w-2" />
                              {new Date(image.expiryDate).toLocaleDateString()}
                            </Badge>
                          </div>
                        )}

                        {/* Delete action button */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={(e) => handleOpenDelete(e, image._id)}
                            className="bg-background/85 hover:bg-destructive border-border h-6 w-6 rounded-full border hover:text-white"
                            title="Delete image"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="bg-background/90 text-foreground border-border flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-wide shadow-md">
                            <Eye className="h-3 w-3" />
                            <span>View Image</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Metadata Footer */}
                      <CardContent className="flex min-w-0 flex-1 flex-col justify-between p-3">
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-foreground truncate text-xs font-semibold">
                            {image.name}
                          </h4>
                          <p className="text-muted-foreground truncate font-sans text-[10px]">
                            {image.description || "No description provided."}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-muted-foreground bg-muted/65 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase">
                            {image.category}
                          </span>
                          <span className="text-muted-foreground/50 font-mono text-[9px]">
                            {new Date(image.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Image Upload Dialog */}
        <ImageUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} projectId={projectId} />

        {/* Passphrase Decryption Dialog */}
        {decryptImageId && (
          <ImageDecryptDialog
            open={decryptOpen}
            onOpenChange={setDecryptOpen}
            projectId={projectId || ""}
            imageId={decryptImageId}
            onDecrypted={handleDecrypted}
          />
        )}

        {/* Full Image Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="animate-in zoom-in-95 flex max-h-[90vh] max-w-4xl flex-col overflow-y-auto duration-200">
            <DialogHeader className="border-border/30 border-b pb-2">
              <DialogTitle>{previewName}</DialogTitle>
            </DialogHeader>
            <div className="bg-muted/20 border-border/40 flex max-h-[60vh] flex-1 items-center justify-center overflow-hidden rounded-lg border p-2">
              <img
                src={previewSrc}
                alt={previewName}
                className="max-h-[55vh] max-w-full rounded-md object-contain shadow-sm"
              />
            </div>
            {previewDescription && (
              <div className="bg-muted/10 border-border/30 text-muted-foreground mt-2 rounded border p-3 font-sans text-xs">
                {previewDescription}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Image Asset"
          description="Are you sure you want to permanently delete this image asset? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          loading={isDeletePending}
        />
      </div>
    </>
  );
}
