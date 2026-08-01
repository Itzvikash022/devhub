"use client";

import { useEffect, useRef } from "react";
import { marked } from "marked";
import mermaid from "mermaid";

interface MarkdownViewerProps {
  content: string;
  mode?: "auto" | "markdown" | "html";
  className?: string;
}

// Configure marked for GFM and raw HTML support
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function MarkdownViewer({ content, mode = "auto", className = "" }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      fontFamily: "Inter, sans-serif",
      securityLevel: "loose",
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Render HTML content safely
    let htmlResult = "";
    if (mode === "html" || (mode === "auto" && content.trim().startsWith("<!DOCTYPE") || content.trim().startsWith("<html"))) {
      htmlResult = content;
    } else {
      try {
        htmlResult = marked.parse(content) as string;
      } catch (err) {
        console.error("Markdown parsing error:", err);
        htmlResult = `<pre class="font-mono text-xs text-destructive p-4 bg-muted/20 rounded">${content}</pre>`;
      }
    }

    containerRef.current.innerHTML = htmlResult;

    // Find and render mermaid code blocks
    const mermaidBlocks = containerRef.current.querySelectorAll("pre code.language-mermaid, pre code.lang-mermaid");
    mermaidBlocks.forEach((codeEl, idx) => {
      const preEl = codeEl.parentElement;
      if (!preEl) return;

      const mermaidCode = codeEl.textContent || "";
      const id = `mermaid-svg-${Date.now()}-${idx}`;

      const div = document.createElement("div");
      div.className = "mermaid-diagram my-4 flex justify-center bg-[#EEF0EA]/40 p-4 rounded-lg border border-[#DAD8CE]";

      mermaid.render(id, mermaidCode).then(({ svg }) => {
        div.innerHTML = svg;
        preEl.replaceWith(div);
      }).catch((err) => {
        console.warn("Mermaid rendering warning:", err);
      });
    });
  }, [content, mode]);

  return (
    <div
      ref={containerRef}
      className={`markdown-content font-inter text-[14px] text-[#20221F] leading-relaxed max-w-full space-y-3 ${className}`}
    />
  );
}
