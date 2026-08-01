"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import {
  MousePointer,
  PenTool,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Eraser,
  Hand,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  FileDown,
  Plus,
  Maximize,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export type ToolMode =
  | "select"
  | "pen"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "text"
  | "eraser"
  | "pan";

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardElement {
  type: ToolMode;
  points?: Point[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  width?: number;
  fill?: string | null;
  radius?: number;
}

const STROKE_COLORS = [
  "#1c1b18",
  "#3a5bd9",
  "#2f8f5b",
  "#c8862c",
  "#c8453f",
  "#767467",
];

const FILL_COLORS = [
  { value: "none", label: "None", class: "bg-transparent border-red-500 relative overflow-hidden" },
  { value: "#dfe3fb", label: "Soft Blue", bg: "#dfe3fb" },
  { value: "#dceee1", label: "Soft Green", bg: "#dceee1" },
  { value: "#f6e6cd", label: "Soft Orange", bg: "#f6e6cd" },
  { value: "#f6dcda", label: "Soft Red", bg: "#f6dcda" },
];

const STROKE_WIDTHS = [2, 4, 6, 8];
const ROUND_RADIUS = 14;
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const HANDLE_SCREEN_SIZE = 9;
const LOCAL_STORAGE_KEY = "devhub_tool_whiteboard_data";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function WhiteboardPage() {
  const [activeTool, setActiveTool] = useState<ToolMode>("select");
  const [currentColor, setCurrentColor] = useState<string>("#1c1b18");
  const [currentFill, setCurrentFill] = useState<string | null>(null);
  const [currentWidth, setCurrentWidth] = useState<number>(4);
  const [roundedEnabled, setRoundedEnabled] = useState<boolean>(false);

  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [zoomScale, setZoomScale] = useState<number>(100);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [textInput, setTextInput] = useState<{
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
    val: string;
  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const viewRef = useRef<{ scale: number; offsetX: number; offsetY: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const isDrawingRef = useRef(false);
  const currentRef = useRef<WhiteboardElement | null>(null);
  const dragModeRef = useRef<"draw" | "move" | "resize-corner" | "resize-endpoint" | "pan" | null>(null);
  const dragHandleRef = useRef<string | null>(null);
  const dragStartWorldRef = useRef<Point | null>(null);
  const dragLastScreenRef = useRef<Point | null>(null);
  const dragOrigElementRef = useRef<WhiteboardElement | null>(null);
  const spacePressedRef = useRef(false);
  const isLoadedRef = useRef(false);

  // Load cached elements & view on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          setElements(parsed.elements);
        }
        if (parsed.view) {
          viewRef.current = parsed.view;
          setZoomScale(Math.round(parsed.view.scale * 100));
        }
      }
    } catch {}
    isLoadedRef.current = true;
  }, []);

  // Save elements & view to localStorage on change
  useEffect(() => {
    if (isLoadedRef.current) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ elements, view: viewRef.current })
      );
    }
  }, [elements]);

  const screenToWorld = (x: number, y: number) => ({
    x: (x - viewRef.current.offsetX) / viewRef.current.scale,
    y: (y - viewRef.current.offsetY) / viewRef.current.scale,
  });

  const getPos = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  };

  /* ─── Drawing Primitives ─── */
  const roundedRectPath = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
  };

  const strokePathOn = (
    c: CanvasRenderingContext2D,
    points: Point[],
    color?: string,
    width?: number,
    composite?: GlobalCompositeOperation
  ) => {
    if (!points || points.length < 2) return;
    c.save();
    c.globalCompositeOperation = composite || "source-over";
    c.strokeStyle = color || "#000";
    c.lineWidth = width || 4;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.stroke();
    c.restore();
  };

  const drawArrowHeadOn = (
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color?: string,
    width: number = 4
  ) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 8 + width * 1.6;
    c.save();
    c.fillStyle = color || "#000";
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - len * Math.cos(angle - Math.PI / 7), y2 - len * Math.sin(angle - Math.PI / 7));
    c.lineTo(x2 - len * Math.cos(angle + Math.PI / 7), y2 - len * Math.sin(angle + Math.PI / 7));
    c.closePath();
    c.fill();
    c.restore();
  };

  const drawElement = useCallback(
    (el: WhiteboardElement, c: CanvasRenderingContext2D) => {
      switch (el.type) {
        case "pen":
          if (el.points) strokePathOn(c, el.points, el.color, el.width);
          break;
        case "eraser":
          if (el.points) strokePathOn(c, el.points, "#000", el.width, "destination-out");
          break;
        case "line":
          if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
            c.save();
            c.strokeStyle = el.color || "#000";
            c.lineWidth = el.width || 4;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(el.x1, el.y1);
            c.lineTo(el.x2, el.y2);
            c.stroke();
            c.restore();
          }
          break;
        case "arrow":
          if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
            c.save();
            c.strokeStyle = el.color || "#000";
            c.lineWidth = el.width || 4;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(el.x1, el.y1);
            c.lineTo(el.x2, el.y2);
            c.stroke();
            c.restore();
            drawArrowHeadOn(c, el.x1, el.y1, el.x2, el.y2, el.color, el.width);
          }
          break;
        case "rect":
          if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
            const x = Math.min(el.x1, el.x2);
            const y = Math.min(el.y1, el.y2);
            const w = Math.abs(el.x2 - el.x1);
            const h = Math.abs(el.y2 - el.y1);
            const r = Math.max(0, Math.min(el.radius || 0, w / 2, h / 2));
            c.save();
            c.strokeStyle = el.color || "#000";
            c.fillStyle = el.fill || "transparent";
            c.lineWidth = el.width || 4;
            c.lineJoin = "round";
            c.beginPath();
            if (r > 0) roundedRectPath(c, x, y, w, h, r);
            else c.rect(x, y, w, h);
            if (el.fill) c.fill();
            c.stroke();
            c.restore();
          }
          break;
        case "circle":
          if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
            const cx = (el.x1 + el.x2) / 2;
            const cy = (el.y1 + el.y2) / 2;
            const rx = Math.abs(el.x2 - el.x1) / 2;
            const ry = Math.abs(el.y2 - el.y1) / 2;
            c.save();
            c.strokeStyle = el.color || "#000";
            c.fillStyle = el.fill || "transparent";
            c.lineWidth = el.width || 4;
            c.beginPath();
            c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            if (el.fill) c.fill();
            c.stroke();
            c.restore();
          }
          break;
        case "text":
          if (el.x !== undefined && el.y !== undefined && el.text) {
            c.save();
            c.fillStyle = el.color || "#000";
            c.font = `${el.fontSize || 18}px Inter, sans-serif`;
            c.textBaseline = "top";
            c.fillText(el.text, el.x, el.y);
            c.restore();
          }
          break;
      }
    },
    []
  );

  /* ─── Bounds & Hit Testing ─── */
  const getElementBounds = useCallback((el: WhiteboardElement) => {
    switch (el.type) {
      case "pen":
      case "eraser": {
        if (!el.points || el.points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        const xs = el.points.map((p) => p.x);
        const ys = el.points.map((p) => p.y);
        const pad = (el.width || 4) / 2;
        return {
          minX: Math.min(...xs) - pad,
          maxX: Math.max(...xs) + pad,
          minY: Math.min(...ys) - pad,
          maxY: Math.max(...ys) + pad,
        };
      }
      case "line":
      case "arrow":
      case "rect":
      case "circle":
        return {
          minX: Math.min(el.x1 || 0, el.x2 || 0),
          maxX: Math.max(el.x1 || 0, el.x2 || 0),
          minY: Math.min(el.y1 || 0, el.y2 || 0),
          maxY: Math.max(el.y1 || 0, el.y2 || 0),
        };
      case "text": {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        const font = `${el.fontSize || 18}px Inter, sans-serif`;
        let w = 60;
        if (ctx) {
          ctx.font = font;
          w = ctx.measureText(el.text || "").width;
        }
        const h = (el.fontSize || 18) * 1.2;
        return {
          minX: el.x || 0,
          maxX: (el.x || 0) + w,
          minY: el.y || 0,
          maxY: (el.y || 0) + h,
        };
      }
    }
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }, []);

  const distToSegment = (p: Point, a: Point, b: Point) => {
    const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = clamp(t, 0, 1);
    return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
  };

  const hitTest = useCallback(
    (pos: Point) => {
      const tol = 6 / viewRef.current.scale;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.type === "line" || el.type === "arrow") {
          if (
            distToSegment(
              pos,
              { x: el.x1 || 0, y: el.y1 || 0 },
              { x: el.x2 || 0, y: el.y2 || 0 }
            ) <= tol + (el.width || 4) / 2
          )
            return i;
        } else {
          const b = getElementBounds(el);
          if (
            pos.x >= b.minX - tol &&
            pos.x <= b.maxX + tol &&
            pos.y >= b.minY - tol &&
            pos.y <= b.maxY + tol
          )
            return i;
        }
      }
      return -1;
    },
    [elements, getElementBounds]
  );

  const getHandles = useCallback(
    (el: WhiteboardElement) => {
      if (el.type === "line" || el.type === "arrow")
        return [
          { name: "p1", x: el.x1 || 0, y: el.y1 || 0 },
          { name: "p2", x: el.x2 || 0, y: el.y2 || 0 },
        ];
      if (el.type === "pen" || el.type === "eraser") return [];
      const b = getElementBounds(el);
      return [
        { name: "nw", x: b.minX, y: b.minY },
        { name: "ne", x: b.maxX, y: b.minY },
        { name: "sw", x: b.minX, y: b.maxY },
        { name: "se", x: b.maxX, y: b.maxY },
      ];
    },
    [getElementBounds]
  );

  const hitTestHandle = useCallback(
    (el: WhiteboardElement, pos: Point) => {
      const hs = (HANDLE_SCREEN_SIZE * 1.6) / viewRef.current.scale;
      for (const h of getHandles(el)) {
        if (Math.abs(pos.x - h.x) <= hs / 2 && Math.abs(pos.y - h.y) <= hs / 2) return h.name;
      }
      return null;
    },
    [getHandles]
  );

  const drawSelectionUI = useCallback(
    (el: WhiteboardElement, ctx: CanvasRenderingContext2D) => {
      const b = getElementBounds(el);
      const pad = 4 / viewRef.current.scale;
      ctx.save();
      ctx.strokeStyle = "#5a55e0";
      ctx.lineWidth = 1.5 / viewRef.current.scale;
      ctx.setLineDash([5 / viewRef.current.scale, 4 / viewRef.current.scale]);
      ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
      ctx.restore();

      const hs = HANDLE_SCREEN_SIZE / viewRef.current.scale;
      getHandles(el).forEach((h) => {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#5a55e0";
        ctx.lineWidth = 1.5 / viewRef.current.scale;
        ctx.beginPath();
        ctx.rect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    },
    [getElementBounds, getHandles]
  );

  /* ─── Render Loop ─── */
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(
      dpr * viewRef.current.scale,
      0,
      0,
      dpr * viewRef.current.scale,
      dpr * viewRef.current.offsetX,
      dpr * viewRef.current.offsetY
    );

    elements.forEach((el) => drawElement(el, ctx));
    if (currentRef.current) drawElement(currentRef.current, ctx);
    if (activeTool === "select" && selectedIndex >= 0 && elements[selectedIndex]) {
      drawSelectionUI(elements[selectedIndex], ctx);
    }
  }, [activeTool, drawElement, drawSelectionUI, elements, selectedIndex]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    redrawAll();
  }, [redrawAll]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll, elements, selectedIndex]);

  /* ─── History Snapshots ─── */
  const snapshotBeforeChange = useCallback(() => {
    setUndoStack((prev) => [...prev, JSON.stringify(elements)]);
    setRedoStack([]);
  }, [elements]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const nextUndo = [...undoStack];
    const snapshot = nextUndo.pop()!;
    setRedoStack((prev) => [...prev, JSON.stringify(elements)]);
    setElements(JSON.parse(snapshot));
    setUndoStack(nextUndo);
    setSelectedIndex(-1);
  }, [elements, undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextRedo = [...redoStack];
    const snapshot = nextRedo.pop()!;
    setUndoStack((prev) => [...prev, JSON.stringify(elements)]);
    setElements(JSON.parse(snapshot));
    setRedoStack(nextRedo);
    setSelectedIndex(-1);
  }, [elements, redoStack]);

  const handleClear = () => {
    if (elements.length === 0) return;
    if (confirm("Clear the whole board? This action cannot be undone.")) {
      snapshotBeforeChange();
      setElements([]);
      setSelectedIndex(-1);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast.info("Canvas cleared.");
    }
  };

  /* ─── Move & Resize Helpers ─── */
  const applyMove = (el: WhiteboardElement, orig: WhiteboardElement, dx: number, dy: number) => {
    switch (el.type) {
      case "pen":
      case "eraser":
        if (orig.points) el.points = orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        break;
      case "line":
      case "arrow":
      case "rect":
      case "circle":
        if (orig.x1 !== undefined) el.x1 = orig.x1 + dx;
        if (orig.y1 !== undefined) el.y1 = orig.y1 + dy;
        if (orig.x2 !== undefined) el.x2 = orig.x2 + dx;
        if (orig.y2 !== undefined) el.y2 = orig.y2 + dy;
        break;
      case "text":
        if (orig.x !== undefined) el.x = orig.x + dx;
        if (orig.y !== undefined) el.y = orig.y + dy;
        break;
    }
  };

  const applyCornerResize = (
    el: WhiteboardElement,
    orig: WhiteboardElement,
    handle: string,
    world: Point
  ) => {
    if (el.type === "text") {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const font = `${orig.fontSize || 18}px Inter, sans-serif`;
      let w = 60;
      if (ctx) {
        ctx.font = font;
        w = ctx.measureText(orig.text || "").width;
      }
      const h = (orig.fontSize || 18) * 1.2;
      let minX = orig.x || 0,
        minY = orig.y || 0,
        maxX = (orig.x || 0) + w,
        maxY = (orig.y || 0) + h;
      if (handle.includes("w")) minX = world.x;
      else if (handle.includes("e")) maxX = world.x;
      if (handle.includes("n")) minY = world.y;
      else if (handle.includes("s")) maxY = world.y;

      const newH = Math.max(maxY - minY, 6);
      const scale = clamp(newH / h, 0.3, 6);
      el.fontSize = (orig.fontSize || 18) * scale;
      el.x = handle.includes("w") ? (orig.x || 0) + w - w * scale : orig.x;
      el.y = handle.includes("n") ? (orig.y || 0) + h - newH : orig.y;
      return;
    }

    let minX = Math.min(orig.x1 || 0, orig.x2 || 0),
      maxX = Math.max(orig.x1 || 0, orig.x2 || 0);
    let minY = Math.min(orig.y1 || 0, orig.y2 || 0),
      maxY = Math.max(orig.y1 || 0, orig.y2 || 0);
    if (handle.includes("w")) minX = world.x;
    else if (handle.includes("e")) maxX = world.x;
    if (handle.includes("n")) minY = world.y;
    else if (handle.includes("s")) maxY = world.y;

    el.x1 = minX;
    el.y1 = minY;
    el.x2 = maxX;
    el.y2 = maxY;
  };

  /* ─── Pointer & Keyboard Event Handlers ─── */
  const cursorForTool = useCallback(() => {
    if (spacePressedRef.current) return "grab";
    if (activeTool === "text") return "text";
    if (activeTool === "select") return "default";
    if (activeTool === "pan") return "grab";
    return "crosshair";
  }, [activeTool]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = getPos(e);

    if (spacePressedRef.current || activeTool === "pan") {
      dragModeRef.current = "pan";
      dragLastScreenRef.current = { x: e.clientX, y: e.clientY };
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grabbing";
        canvasRef.current.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (activeTool === "select") {
      if (selectedIndex >= 0) {
        const el = elements[selectedIndex];
        const handle = hitTestHandle(el, world);
        if (handle) {
          snapshotBeforeChange();
          dragModeRef.current =
            el.type === "line" || el.type === "arrow" ? "resize-endpoint" : "resize-corner";
          dragHandleRef.current = handle;
          dragOrigElementRef.current = JSON.parse(JSON.stringify(el));
          dragStartWorldRef.current = world;
          if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
          return;
        }
      }
      const hitIdx = hitTest(world);
      if (hitIdx >= 0) {
        setSelectedIndex(hitIdx);
        snapshotBeforeChange();
        dragModeRef.current = "move";
        dragOrigElementRef.current = JSON.parse(JSON.stringify(elements[hitIdx]));
        dragStartWorldRef.current = world;
        if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
      } else {
        setSelectedIndex(-1);
        dragModeRef.current = null;
      }
      redrawAll();
      return;
    }

    if (activeTool === "text") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      setTextInput({
        screenX: cssX,
        screenY: cssY,
        worldX: world.x,
        worldY: world.y,
        val: "",
      });
      return;
    }

    isDrawingRef.current = true;
    dragModeRef.current = "draw";

    if (activeTool === "pen") {
      currentRef.current = { type: "pen", points: [world], color: currentColor, width: currentWidth };
    } else if (activeTool === "eraser") {
      currentRef.current = { type: "eraser", points: [world], width: currentWidth * 5 };
    } else {
      currentRef.current = {
        type: activeTool,
        x1: world.x,
        y1: world.y,
        x2: world.x,
        y2: world.y,
        color: currentColor,
        width: currentWidth,
        fill: activeTool === "rect" || activeTool === "circle" ? currentFill : undefined,
        radius: activeTool === "rect" ? (roundedEnabled ? ROUND_RADIUS : 0) : undefined,
      };
    }
    if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
    redrawAll();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current === "pan" && dragLastScreenRef.current) {
      const dx = e.clientX - dragLastScreenRef.current.x;
      const dy = e.clientY - dragLastScreenRef.current.y;
      viewRef.current.offsetX += dx;
      viewRef.current.offsetY += dy;
      dragLastScreenRef.current = { x: e.clientX, y: e.clientY };
      redrawAll();
      return;
    }

    const world = getPos(e);

    if (dragModeRef.current === "move" && selectedIndex >= 0 && dragOrigElementRef.current && dragStartWorldRef.current) {
      const dx = world.x - dragStartWorldRef.current.x;
      const dy = world.y - dragStartWorldRef.current.y;
      setElements((prev) => {
        const next = [...prev];
        if (next[selectedIndex]) {
          applyMove(next[selectedIndex], dragOrigElementRef.current!, dx, dy);
        }
        return next;
      });
      return;
    }

    if (dragModeRef.current === "resize-corner" && selectedIndex >= 0 && dragOrigElementRef.current && dragHandleRef.current) {
      setElements((prev) => {
        const next = [...prev];
        if (next[selectedIndex]) {
          applyCornerResize(next[selectedIndex], dragOrigElementRef.current!, dragHandleRef.current!, world);
        }
        return next;
      });
      return;
    }

    if (dragModeRef.current === "resize-endpoint" && selectedIndex >= 0 && dragHandleRef.current) {
      setElements((prev) => {
        const next = [...prev];
        const el = next[selectedIndex];
        if (el) {
          if (dragHandleRef.current === "p1") {
            el.x1 = world.x;
            el.y1 = world.y;
          } else {
            el.x2 = world.x;
            el.y2 = world.y;
          }
        }
        return next;
      });
      return;
    }

    if (dragModeRef.current === "draw" && isDrawingRef.current && currentRef.current) {
      if (currentRef.current.type === "pen" || currentRef.current.type === "eraser") {
        currentRef.current.points = [...(currentRef.current.points || []), world];
      } else {
        currentRef.current.x2 = world.x;
        currentRef.current.y2 = world.y;
      }
      redrawAll();
    }
  };

  const handlePointerUp = () => {
    if (dragModeRef.current === "pan") {
      dragModeRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = cursorForTool();
      return;
    }

    if (dragModeRef.current === "move" || dragModeRef.current === "resize-corner" || dragModeRef.current === "resize-endpoint") {
      dragModeRef.current = null;
      dragOrigElementRef.current = null;
      redrawAll();
      return;
    }

    if (dragModeRef.current === "draw") {
      isDrawingRef.current = false;
      const el = currentRef.current;
      if (el) {
        const isMeaningful =
          el.type === "pen" || el.type === "eraser"
            ? (el.points?.length || 0) > 1
            : Math.hypot((el.x2 || 0) - (el.x1 || 0), (el.y2 || 0) - (el.y1 || 0)) > 2;

        if (isMeaningful) {
          snapshotBeforeChange();
          setElements((prev) => [...prev, el]);
        }
      }
      currentRef.current = null;
      dragModeRef.current = null;
      redrawAll();
    }
  };

  /* ─── Wheel Zoom ─── */
  const zoomAt = useCallback(
    (cssX: number, cssY: number, factor: number) => {
      const world = screenToWorld(cssX, cssY);
      viewRef.current.scale = clamp(viewRef.current.scale * factor, MIN_SCALE, MAX_SCALE);
      viewRef.current.offsetX = cssX - world.x * viewRef.current.scale;
      viewRef.current.offsetY = cssY - world.y * viewRef.current.scale;
      setZoomScale(Math.round(viewRef.current.scale * 100));
      redrawAll();
    },
    [redrawAll]
  );

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.08 : 1 / 1.08);
  };

  /* ─── Keyboard Shortcuts ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;

      if (e.code === "Space") {
        spacePressedRef.current = true;
        if (!dragModeRef.current && canvasRef.current) {
          canvasRef.current.style.cursor = "grab";
        }
        e.preventDefault();
      }

      if ((e.key === "Delete" || e.key === "Backspace") && activeTool === "select" && selectedIndex >= 0) {
        e.preventDefault();
        snapshotBeforeChange();
        setElements((prev) => prev.filter((_, idx) => idx !== selectedIndex));
        setSelectedIndex(-1);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        if (!dragModeRef.current && canvasRef.current) {
          canvasRef.current.style.cursor = cursorForTool();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeTool, handleRedo, handleUndo, selectedIndex, snapshotBeforeChange, cursorForTool]);

  /* ─── Text Input Commit ─── */
  const commitTextInput = () => {
    if (textInput && textInput.val.trim()) {
      snapshotBeforeChange();
      setElements((prev) => [
        ...prev,
        {
          type: "text",
          x: textInput.worldX,
          y: textInput.worldY,
          text: textInput.val.trim(),
          color: currentColor,
          fontSize: 18,
        },
      ]);
    }
    setTextInput(null);
  };

  /* ─── Offscreen 1:1 Export Canvas Engine ─── */
  const getContentBounds = useCallback(() => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (elements.length === 0 || !canvas) {
      return { minX: 0, minY: 0, maxX: (canvas?.width || 800) / dpr, maxY: (canvas?.height || 600) / dpr };
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    elements.forEach((el) => {
      const b = getElementBounds(el);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    });
    const pad = 24;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [elements, getElementBounds]);

  const renderExportCanvas = useCallback(() => {
    const dpr = window.devicePixelRatio || 1;
    const bounds = getContentBounds();
    const w = Math.max(bounds.maxX - bounds.minX, 1);
    const h = Math.max(bounds.maxY - bounds.minY, 1);

    const exp = document.createElement("canvas");
    exp.width = w * dpr;
    exp.height = h * dpr;
    const ex = exp.getContext("2d");
    if (!ex) return exp;

    ex.setTransform(dpr, 0, 0, dpr, -bounds.minX * dpr, -bounds.minY * dpr);
    ex.fillStyle = "#ffffff";
    ex.fillRect(bounds.minX, bounds.minY, w, h);
    elements.forEach((el) => drawElement(el, ex));
    return exp;
  }, [drawElement, elements, getContentBounds]);

  const handleExportPNG = () => {
    const exp = renderExportCanvas();
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = exp.toDataURL("image/png");
    link.click();
    toast.success("Exported whiteboard.png");
  };

  const handleExportPDF = () => {
    const exp = renderExportCanvas();
    const dpr = window.devicePixelRatio || 1;
    const wPx = exp.width / dpr;
    const hPx = exp.height / dpr;

    const pdf = new jsPDF({
      orientation: wPx >= hPx ? "l" : "p",
      unit: "px",
      format: [wPx, hPx],
    });

    pdf.addImage(exp.toDataURL("image/png"), "PNG", 0, 0, wPx, hPx);
    pdf.save(`whiteboard-${Date.now()}.pdf`);
    toast.success("Exported whiteboard.pdf");
  };

  return (
    <>
      <SetPageHeader title="Whiteboard Canvas" />

      <div className="w-full space-y-3 p-6 flex flex-col min-h-[calc(100vh-140px)]">
        {/* Top Control Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap rounded-xl border border-[#DAD8CE] bg-[#F8F9F5] p-2.5 shadow-xs">
          {/* Tool Options */}
          {[
            { id: "select", title: "Select / Move / Resize", icon: MousePointer },
            { id: "pen", title: "Pen", icon: PenTool },
            { id: "line", title: "Line", icon: Minus },
            { id: "arrow", title: "Arrow", icon: ArrowUpRight },
            { id: "rect", title: "Rectangle", icon: Square },
            { id: "circle", title: "Circle", icon: Circle },
            { id: "text", title: "Text", icon: Type },
            { id: "eraser", title: "Eraser", icon: Eraser },
            { id: "pan", title: "Pan (or hold Space)", icon: Hand },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id as ToolMode);
                  if (t.id !== "select") setSelectedIndex(-1);
                }}
                className={`flex h-8.5 w-8.5 items-center justify-center rounded-lg border transition-colors ${
                  active
                    ? "bg-[#5a55e0] border-[#5a55e0] text-white shadow-xs"
                    : "border-transparent text-[#716f64] hover:bg-[#EEF0EA] hover:text-[#1c1b18]"
                }`}
                title={t.title}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}

          <div className="mx-1 h-6 w-px bg-[#DAD8CE]" />

          {/* Stroke Swatches */}
          <span className="font-mono text-[10px] font-medium tracking-wider text-[#a7a496] uppercase">
            Stroke
          </span>
          <div className="flex items-center gap-1">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                style={{ backgroundColor: c }}
                className={`h-5.5 w-5.5 rounded-full transition-transform ${
                  currentColor === c
                    ? "scale-110 ring-2 ring-[#5a55e0] ring-offset-1"
                    : "hover:scale-105"
                }`}
              />
            ))}
          </div>

          <div className="mx-1 h-6 w-px bg-[#DAD8CE]" />

          {/* Fill Swatches */}
          <span className="font-mono text-[10px] font-medium tracking-wider text-[#a7a496] uppercase">
            Fill
          </span>
          <div className="flex items-center gap-1">
            {FILL_COLORS.map((f) => {
              const selected = currentFill === (f.value === "none" ? null : f.value);
              return (
                <button
                  key={f.value}
                  onClick={() => setCurrentFill(f.value === "none" ? null : f.value)}
                  style={{ backgroundColor: f.bg }}
                  title={f.label}
                  className={`h-5.5 w-5.5 rounded-md border border-[#DAD8CE] transition-transform ${
                    f.value === "none"
                      ? "bg-[#F8F9F5] relative overflow-hidden"
                      : ""
                  } ${
                    selected
                      ? "border-[#5a55e0] ring-2 ring-[#5a55e0] ring-offset-1"
                      : "hover:scale-105"
                  }`}
                >
                  {f.value === "none" && (
                    <div className="absolute inset-0 bg-red-500/80 rotate-45 h-0.5 my-auto" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mx-1 h-6 w-px bg-[#DAD8CE]" />

          {/* Width Buttons */}
          <span className="font-mono text-[10px] font-medium tracking-wider text-[#a7a496] uppercase">
            Width
          </span>
          <div className="flex items-center gap-0.5">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setCurrentWidth(w)}
                className={`px-2 py-0.5 font-mono text-[11px] rounded-md transition-colors ${
                  currentWidth === w
                    ? "bg-[#5a55e0] text-white font-semibold"
                    : "text-[#716f64] hover:bg-[#EEF0EA]"
                }`}
              >
                {w}px
              </button>
            ))}
          </div>

          <div className="mx-1 h-6 w-px bg-[#DAD8CE]" />

          {/* Rounded Corner Toggle */}
          <button
            onClick={() => setRoundedEnabled(!roundedEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-inter transition-colors ${
              roundedEnabled
                ? "bg-[#5a55e0]/10 border-[#5a55e0] text-[#5a55e0] font-semibold"
                : "border-[#DAD8CE] text-[#716f64] hover:bg-[#EEF0EA]"
            }`}
            title="Rounded corners for new rectangles"
          >
            <span
              className={`h-3 w-4 border-1.5 border-current ${
                roundedEnabled ? "rounded-md" : "rounded-xs"
              }`}
            />
            Rounded
          </button>

          {/* Right Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#DAD8CE] bg-white text-xs font-inter text-[#1c1b18] hover:bg-[#EEF0EA] disabled:opacity-40 transition-colors"
              title="Undo (Ctrl/Cmd+Z)"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#DAD8CE] bg-white text-xs font-inter text-[#1c1b18] hover:bg-[#EEF0EA] disabled:opacity-40 transition-colors"
              title="Redo (Ctrl/Cmd+Shift+Z)"
            >
              <RotateCw className="h-3.5 w-3.5" /> Redo
            </button>

            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#DAD8CE] bg-white text-xs font-inter text-[#716f64] hover:text-[#c8453f] hover:border-[#c8453f] transition-colors"
              title="Clear board"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>

            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#5a55e0] text-white text-xs font-inter font-medium hover:bg-[#4d48d6] transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export PNG
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2f8f5b] text-white text-xs font-inter font-medium hover:bg-[#267a4c] transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>
        </div>

        {/* Canvas Wrap Area */}
        <div
          ref={wrapRef}
          className="relative flex-1 w-full min-h-[580px] rounded-2xl border border-[#DAD8CE] bg-[#fbfaf6] overflow-hidden shadow-xs"
          style={{
            backgroundImage: "radial-gradient(#cfccbd 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ cursor: cursorForTool() }}
          />

          {/* Interactive Text Input Overlay */}
          {textInput && (
            <input
              type="text"
              autoFocus
              value={textInput.val}
              onChange={(e) => setTextInput({ ...textInput, val: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTextInput();
                }
                if (e.key === "Escape") {
                  setTextInput(null);
                }
              }}
              onBlur={commitTextInput}
              style={{
                left: `${textInput.screenX}px`,
                top: `${textInput.screenY}px`,
                color: currentColor,
                fontSize: `${18 * viewRef.current.scale}px`,
              }}
              className="absolute bg-transparent border-none outline-none font-sans p-0 m-0 border-b border-dashed border-[#5a55e0] min-w-[50px] z-30"
            />
          )}

          {/* Bottom Left Canvas Hint */}
          <div className="absolute bottom-4 left-4 rounded-lg border border-[#DAD8CE] bg-white/80 backdrop-blur-xs px-2.5 py-1.5 text-[11px] text-[#a7a496] pointer-events-none select-none">
            Hold <strong className="text-[#1c1b18]">Space</strong> to pan · Scroll to zoom
          </div>

          {/* Bottom Right Zoom Control Floating Panel */}
          <div className="absolute bottom-4 right-4 flex items-center gap-0.5 rounded-lg border border-[#DAD8CE] bg-white/90 backdrop-blur-xs p-1 shadow-md select-none z-20">
            <button
              onClick={() => zoomBy(1 / 1.2)}
              className="flex h-6 w-6 items-center justify-center rounded-md border-none text-xs text-[#716f64] hover:bg-[#f0eee5] hover:text-[#1c1b18]"
              title="Zoom Out"
            >
              <Minus className="h-3 w-3" />
            </button>

            <span className="min-w-[40px] text-center font-mono text-[11px] text-[#716f64]">
              {zoomScale}%
            </span>

            <button
              onClick={() => zoomBy(1.2)}
              className="flex h-6 w-6 items-center justify-center rounded-md border-none text-xs text-[#716f64] hover:bg-[#f0eee5] hover:text-[#1c1b18]"
              title="Zoom In"
            >
              <Plus className="h-3 w-3" />
            </button>

            <div className="mx-1 h-4 w-px bg-[#DAD8CE]" />

            <button
              onClick={() => {
                viewRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
                setZoomScale(100);
                redrawAll();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md border-none text-xs text-[#716f64] hover:bg-[#f0eee5] hover:text-[#1c1b18]"
              title="Reset View"
            >
              <Maximize className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
