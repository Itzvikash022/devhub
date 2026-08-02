"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProjectSection, useUpdateProjectCustomDetails } from "@/hooks/useProjects";
import { ArrowUpDown, GripVertical, Loader2, RotateCcw, X, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface MoveSectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sections: ProjectSection[];
  onSaveSuccess?: (reorderedSections?: ProjectSection[]) => void;
}

const GAP = 16;

/**
 * Calculates skeleton card height based on field count
 */

export function getEstimatedCardHeight(section: ProjectSection): number {
  const baseHeader = 54;
  const fieldHeight = 44;
  const padding = 28;
  const fieldCount = section.fields.length === 0 ? 1 : section.fields.length;
  return baseHeader + fieldCount * fieldHeight + padding;
}

export interface LayoutPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeSectionLayout(
  sectionsList: ProjectSection[],
  containerWidth: number
): { positions: Record<number, LayoutPos>; totalHeight: number } {
  if (containerWidth <= 0 || sectionsList.length === 0) {
    return { positions: {}, totalHeight: 240 };
  }

  const isMobile = containerWidth < 640;
  const numCols = isMobile ? 1 : 2;
  const colWidth = numCols === 1 ? containerWidth : (containerWidth - GAP) / 2;
  const colHeights = Array(numCols).fill(0);
  const positions: Record<number, LayoutPos> = {};

  sectionsList.forEach((sec, idx) => {
    const h = getEstimatedCardHeight(sec);
    let minCol = 0;
    for (let c = 1; c < numCols; c++) {
      if (colHeights[c] < colHeights[minCol]) {
        minCol = c;
      }
    }

    const x = minCol * (colWidth + GAP);
    const y = colHeights[minCol];
    positions[idx] = { x, y, w: colWidth, h };
    colHeights[minCol] += h + GAP;
  });

  const totalHeight = Math.max(...colHeights) - GAP;
  return { positions, totalHeight: Math.max(totalHeight, 240) };
}

export function MoveSectionsDialog({
  open,
  onOpenChange,
  projectId,
  sections,
  onSaveSuccess,
}: MoveSectionsDialogProps) {
  // Working order array of indices [0, 1, 2...]
  const [workingOrder, setWorkingOrder] = useState<number[]>([]);
  const [savedOrder, setSavedOrder] = useState<number[]>([]);
  const [layoutPositions, setLayoutPositions] = useState<Record<number, LayoutPos>>({});
  const [containerHeight, setContainerHeight] = useState(320);

  // Drag State
  const [draggedSecIndex, setDraggedSecIndex] = useState<number | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number; w: number } | null>(null);
  const [poppingIndex, setPoppingIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<number | null>(null);
  const grabOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const { mutate: updateCustomDetails, isPending: isSaving } =
    useUpdateProjectCustomDetails(projectId);

  // Reset order when dialog opens
  useEffect(() => {
    if (open) {
      const initial = sections.map((_, idx) => idx);
      setWorkingOrder(initial);
      setSavedOrder(initial);
      setDraggedSecIndex(null);
      setGhostPos(null);
    }
  }, [open, sections]);

  // Recalculate layout helper
  const updateLayout = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width <= 0) return;

    const currentSectionsInOrder = workingOrder.map((idx) => sections[idx]);
    const { positions, totalHeight } = computeSectionLayout(currentSectionsInOrder, width);

    // Map computed layout back to original section index
    const mappedPositions: Record<number, LayoutPos> = {};
    workingOrder.forEach((originalSecIdx, orderIdx) => {
      if (positions[orderIdx]) {
        mappedPositions[originalSecIdx] = positions[orderIdx];
      }
    });

    setLayoutPositions(mappedPositions);
    setContainerHeight(totalHeight);
  }, [workingOrder, sections]);

  // Trigger measurement on open & resize
  useEffect(() => {
    if (!open) return;

    // Initial measurement with double-rAF delay for modal transition completion
    const timer = setTimeout(() => {
      updateLayout();
    }, 60);

    return () => clearTimeout(timer);
  }, [open, updateLayout]);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    updateLayout();

    const resizeObserver = new ResizeObserver(() => {
      updateLayout();
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [open, workingOrder, updateLayout]);

  const isUnsaved = JSON.stringify(workingOrder) !== JSON.stringify(savedOrder);

  // Reorder helper
  const reorderSection = useCallback((fromSecIdx: number, toSecIdx: number) => {
    setWorkingOrder((prev) => {
      const copy = [...prev];
      const fromPos = copy.indexOf(fromSecIdx);
      const toPos = copy.indexOf(toSecIdx);
      if (fromPos === -1 || toPos === -1 || fromPos === toPos) return prev;

      copy.splice(fromPos, 1);
      copy.splice(toPos, 0, fromSecIdx);
      return copy;
    });
  }, []);

  // Keyboard accessibility move step
  const handleKeyboardMove = (secIdx: number, direction: -1 | 1) => {
    const currPos = workingOrder.indexOf(secIdx);
    const targetPos = currPos + direction;
    if (targetPos < 0 || targetPos >= workingOrder.length) return;

    const targetSecIdx = workingOrder[targetPos];
    reorderSection(secIdx, targetSecIdx);
  };

  // Pointer Drag Handlers — Pinned with card center directly under cursor
  const handlePointerDown = (secIdx: number, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();

    const cardEl = e.currentTarget as HTMLElement;
    const cardRect = cardEl.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

    setDraggedSecIndex(secIdx);
    draggingIdRef.current = secIdx;
    setGhostPos({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
      w: cardRect.width,
    });

    try {
      cardEl.setPointerCapture(e.pointerId);
    } catch {}
  };

  useEffect(() => {
    if (draggedSecIndex === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      setGhostPos({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
        w: ghostPos?.w || 320,
      });

      // Find card under pointer
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      for (const el of elements) {
        const cardEl = el.closest("[data-section-index]");
        if (cardEl) {
          const targetIdx = Number(cardEl.getAttribute("data-section-index"));
          if (
            !isNaN(targetIdx) &&
            draggingIdRef.current !== null &&
            targetIdx !== draggingIdRef.current
          ) {
            reorderSection(draggingIdRef.current, targetIdx);
          }
          break;
        }
      }
    };

    const handlePointerUp = () => {
      if (draggingIdRef.current !== null) {
        setPoppingIndex(draggingIdRef.current);
        setTimeout(() => setPoppingIndex(null), 450);
      }
      setDraggedSecIndex(null);
      draggingIdRef.current = null;
      setGhostPos(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggedSecIndex, ghostPos?.w, reorderSection]);

  const handleReset = () => {
    setWorkingOrder(savedOrder);
  };

  const handleSaveOrder = () => {
    const reorderedSections = workingOrder.map((idx) => sections[idx]);
    updateCustomDetails(
      { sections: reorderedSections },
      {
        onSuccess: () => {
          setSavedOrder(workingOrder);
          onOpenChange(false);
          toast.success("Section order saved.");
          onSaveSuccess?.(reorderedSections);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl w-[94vw] max-h-[90vh] flex flex-col p-0 overflow-hidden border border-[#DAD8CE] bg-[#EEF0EA] shadow-2xl rounded-2xl"
      >
        {/* Modal Header */}
        <DialogHeader className="p-5 border-b border-[#DAD8CE] bg-[#F8F9F5] flex flex-row items-start justify-between space-y-0">
          <div>
            <DialogTitle className="font-heading text-lg font-semibold text-[#20221F] flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-[#4F46C7]" />
              Rearrange sections
            </DialogTitle>
            <DialogDescription className="font-inter text-xs text-[#6B6E64] mt-1 max-w-xl leading-relaxed">
              Press and hold a card to move it. This preview shows how sections will look once saved
              — cards won't move on the page until you press <strong>Save order</strong>.
            </DialogDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-md border border-[#DAD8CE] bg-[#F8F9F5] hover:bg-[#EEF0EA] flex items-center justify-center text-[#6B6E64] hover:text-[#20221F] transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Modal Body — Interactive JS Masonry Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#EEF0EA]/70 relative min-h-[360px]">
          <div
            ref={containerRef}
            className="relative w-full transition-[height] duration-300 ease-out"
            style={{ height: `${containerHeight}px` }}
          >
            {workingOrder.map((secIdx) => {
              const sec = sections[secIdx];
              if (!sec) return null;

              const pos = layoutPositions[secIdx] || { x: 0, y: 0, w: 300, h: 180 };
              const isDraggingThis = draggedSecIndex === secIdx;
              const isPoppingThis = poppingIndex === secIdx;
              const isFirst = workingOrder.indexOf(secIdx) === 0;
              const isLast = workingOrder.indexOf(secIdx) === workingOrder.length - 1;

              return (
                <div
                  key={secIdx}
                  data-section-index={secIdx}
                  onPointerDown={(e) => handlePointerDown(secIdx, e)}
                  style={{
                    position: "absolute",
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${pos.w}px`,
                    height: `${pos.h}px`,
                    transform: isPoppingThis ? "scale(1.04)" : "scale(1)",
                    transition: isDraggingThis
                      ? "none"
                      : "left 380ms cubic-bezier(0.34, 1.56, 0.64, 1), top 380ms cubic-bezier(0.34, 1.56, 0.64, 1), width 200ms ease, height 200ms ease, transform 300ms ease, opacity 200ms ease",
                  }}
                  className={`rounded-xl border p-4 select-none cursor-grab active:cursor-grabbing backdrop-blur-md transition-shadow group ${
                    isDraggingThis
                      ? "opacity-25 border-dashed border-[#20221F]/40 bg-transparent shadow-none"
                      : "bg-[#F8F9F5]/85 border-[#DAD8CE] hover:border-[#4F46C7]/50 shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Grip Icon */}
                  <GripVertical className="absolute top-3.5 right-3.5 w-4 h-4 text-[#6B6E64]/40 group-hover:text-[#4F46C7] transition-colors" />

                  {/* Section Title */}
                  <h4 className="font-heading text-sm font-semibold text-[#20221F] pr-12 truncate mb-3">
                    {sec.heading}
                  </h4>

                  {/* Skeleton Field Bars */}
                  <div className="space-y-2.5 opacity-80">
                    <div className="h-2 rounded-full bg-[#DAD8CE]/70 w-full" />
                    <div className="h-2 rounded-full bg-[#DAD8CE]/50 w-[78%]" />
                    <div className="h-2 rounded-full bg-[#DAD8CE]/60 w-[60%]" />
                    {sec.fields.length > 2 && (
                      <div className="h-2 rounded-full bg-[#DAD8CE]/40 w-[85%]" />
                    )}
                  </div>

                  {/* Keyboard Reorder Controls */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#F8F9F5] border border-[#DAD8CE] rounded-md px-1 py-0.5 shadow-xs">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKeyboardMove(secIdx, -1);
                      }}
                      className="p-1 hover:text-[#4F46C7] disabled:opacity-30 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKeyboardMove(secIdx, 1);
                      }}
                      className="p-1 hover:text-[#4F46C7] disabled:opacity-30 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Ghost Floating Preview Element during Drag - Absolute inside containerRef */}
            {ghostPos && draggedSecIndex !== null && sections[draggedSecIndex] && (
              <div
                style={{
                  position: "absolute",
                  left: `${ghostPos.x}px`,
                  top: `${ghostPos.y}px`,
                  width: `${ghostPos.w}px`,
                  transform: "translate(-50%, -50%) rotate(-2deg) scale(1.03)",
                }}
                className="pointer-events-none z-[300] rounded-xl bg-[#F8F9F5] border-2 border-[#4F46C7] backdrop-blur-md shadow-2xl p-4 transition-transform"
              >
                <GripVertical className="absolute top-3.5 right-3.5 w-4 h-4 text-[#4F46C7]" />
                <h4 className="font-heading text-sm font-semibold text-[#20221F] pr-12 truncate mb-3">
                  {sections[draggedSecIndex].heading}
                </h4>
                <div className="space-y-2.5 opacity-90">
                  <div className="h-2 rounded-full bg-[#4F46C7]/25 w-full" />
                  <div className="h-2 rounded-full bg-[#4F46C7]/20 w-[78%]" />
                  <div className="h-2 rounded-full bg-[#4F46C7]/15 w-[60%]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-[#DAD8CE] bg-[#F8F9F5] flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {isUnsaved ? (
              <div className="flex items-center gap-2 font-inter text-xs text-[#B8792E]">
                <span className="w-2 h-2 rounded-full bg-[#B8792E] animate-ping shrink-0" />
                <span className="font-medium">Unsaved changes</span>
                <button
                  onClick={handleReset}
                  className="font-inter text-xs text-[#6B6E64] hover:text-[#4F46C7] underline ml-2 inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset order
                </button>
              </div>
            ) : (
              <span className="font-inter text-xs text-[#6B6E64]">No changes made</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveOrder}
              disabled={isSaving || !isUnsaved}
              className="bg-[#4F46C7] hover:bg-[#4338a8] text-white text-xs gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save order"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
