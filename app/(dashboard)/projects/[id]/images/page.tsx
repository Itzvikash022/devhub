/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useImagesList, useDeleteImage, ImageAssetData } from "@/hooks/useImages";
import { EmptyState } from "@/components/shared/EmptyState";
import { ImageUploadDialog } from "@/components/dialogs/ImageUploadDialog";
import { ImageDecryptDialog } from "@/components/dialogs/ImageDecryptDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon, Plus, Trash2, Lock, Calendar, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";

// Category display mapping
const CATEGORY_LABELS: Record<string, string> = {
  all: "All Images",
  mockup: "Mockups",
  screenshot: "Screenshots",
  architecture: "Architecture",
  asset: "Design Assets",
  other: "Others",
};

export default function ImagesTab() {
  const { id: projectId } = useParams() as { id: string };

  const now = useMemo(() => new Date(), []);

  // Filter category state
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Decrypted images repository (stores decrypted base64 data transiently in memory)
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  // Dialog control states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [decryptOpen, setDecryptOpen] = useState(false);
  const [decryptImageId, setDecryptImageId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewDescription, setPreviewDescription] = useState("");

  // Queries & Mutations
  const { data: images = [], isLoading, error } = useImagesList(projectId);
  const { mutate: deleteImage, isPending: isDeletePending } = useDeleteImage(projectId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
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
      <div className="text-destructive p-6 text-center">Failed to load project image vault.</div>
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
        // Fetch signed download URL on-demand (lazy action)
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

    // Cache the decrypted Base64 string in memory
    setDecryptedCache((prev) => ({
      ...prev,
      [decryptImageId]: decryptedData,
    }));

    // Find the image metadata to open preview immediately
    const img = images.find((i) => i._id === decryptImageId);
    if (img) {
      setPreviewName(img.name);
      setPreviewSrc(decryptedData);
      setPreviewDescription(img.description || "");
      setPreviewOpen(true);
    }

    setDecryptImageId(null);
  };

  // Filter images list
  const filteredImages = images.filter((img) => {
    if (activeCategory === "all") return true;
    return img.category === activeCategory;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header controls */}
      <div className="border-border/55 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-foreground text-xl font-semibold">Image Vault</h2>
          <p className="text-muted-foreground text-xs">
            Store mockups, system architecture schemas, and layout assets securely in Cloudflare R2.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenUpload} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Upload Image
        </Button>
      </div>

      {images.length === 0 ? (
        <Card className="bg-card border-border border">
          <CardContent className="p-0">
            <EmptyState
              icon={ImageIcon}
              title="Image Vault is empty"
              description="Keep system diagrams, UI designs, and mockups here. Drag & drop files directly."
              action={{
                label: "Upload Image",
                onClick: handleOpenUpload,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Category Tabs */}
          <div className="border-border flex flex-wrap gap-1.5 border-b pb-1">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`-mb-[5px] rounded-t-md border-b-2 px-3 py-1.5 text-xs font-medium transition-all ${
                  activeCategory === key
                    ? "border-primary text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          {filteredImages.length === 0 ? (
            <div className="border-border bg-card/25 rounded-lg border border-dashed py-16 text-center">
              <p className="text-muted-foreground text-xs">
                No images stored in category:{" "}
                <span className="text-foreground font-semibold">
                  {CATEGORY_LABELS[activeCategory]}
                </span>
                .
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

                      {/* Expiration date indicator (if not expired) */}
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

                      {/* Actions float (Trash) */}
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

                      {/* Hover eye overlay for previews */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="bg-background/90 text-foreground border-border flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-wide shadow-md">
                          <Eye className="h-3 w-3" />
                          <span>View Image</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Card Footer */}
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
          projectId={projectId}
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
  );
}
