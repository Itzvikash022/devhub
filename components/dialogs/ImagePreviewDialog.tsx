"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  name: string;
  description?: string;
  dimensions?: string;
  sizeStr?: string;
  fileType?: string;
  onDownload?: () => void;
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  src,
  name,
  description,
  dimensions,
  sizeStr,
  fileType,
  onDownload,
}: ImagePreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset states on source/open change
  useEffect(() => {
    if (open) {
      setLoading(true);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, src]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) {
        setPosition({ x: 0, y: 0 }); // snap back
      }
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      window.open(src, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl lg:max-w-7xl w-[95vw] max-h-[95vh] flex flex-col p-6 animate-in zoom-in-95 duration-200">
        <DialogHeader className="border-b border-border/30 pb-3 flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <DialogTitle className="text-sm font-semibold truncate max-w-[500px] text-left">
              {name}
            </DialogTitle>
            {(dimensions || sizeStr || fileType) && (
              <div className="flex gap-2 text-[10px] text-muted-foreground font-mono uppercase">
                {dimensions && <span>{dimensions}</span>}
                {sizeStr && <span>• {sizeStr}</span>}
                {fileType && <span>• {fileType.split("/").pop() || fileType}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mr-6">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="h-8 w-8"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="h-8 w-8"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleReset}
              disabled={scale === 1 && position.x === 0 && position.y === 0}
              className="h-8 w-8"
              title="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-primary"
              title="Download Original"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Zoom & Pan Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="bg-muted/10 border border-border/40 relative flex h-[75vh] flex-1 items-center justify-center overflow-hidden rounded-lg p-2 select-none"
        >
          {loading && (
            <div className="absolute z-10 inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <img
            src={src}
            alt={name}
            onLoad={() => setLoading(false)}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="max-h-[71vh] max-w-full rounded object-contain shadow-sm pointer-events-none"
          />
        </div>

        {description && (
          <div className="bg-muted/20 border border-border/30 text-muted-foreground mt-3 rounded p-3 font-sans text-xs text-left max-h-[12vh] overflow-y-auto">
            {description}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
