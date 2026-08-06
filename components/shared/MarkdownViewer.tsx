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

const isHtmlContent = (text: string | undefined | null): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<div") ||
    (trimmed.startsWith("<") &&
      trimmed.includes(">") &&
      (trimmed.includes("</div>") || trimmed.includes("</html>")))
  );
};

export function MarkdownViewer({ content, mode = "auto", className = "" }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      fontFamily: "Inter, sans-serif",
      securityLevel: "loose",
    });

    return () => {
      // Clean up all dynamic listeners on unmount
      cleanupsRef.current.forEach((cleanup) => cleanup());
      cleanupsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Run cleanups from previous renders to avoid duplicate window event listeners
    cleanupsRef.current.forEach((cleanup) => cleanup());
    cleanupsRef.current = [];

    // Render HTML content safely
    let htmlResult = "";
    if (mode === "html" || (mode === "auto" && isHtmlContent(content))) {
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

    // Execute script tags dynamically, wrapping in an IIFE to scope variables locally
    // and using a Proxy document/window to scope selectors and track/cleanup global event listeners.
    const scripts = containerRef.current.querySelectorAll("script");
    scripts.forEach((oldScript, idx) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Store the container element in a temporary window property unique to this execution
      const containerKey = `__devhub_note_container_${Date.now()}_${idx}`;
      (window as any)[containerKey] = containerRef.current;

      // Create a temporary registration callback for window event listeners to track for cleanup
      const cleanupKey = `__devhub_cleanup_${Date.now()}_${idx}`;
      const registeredListeners: Array<{ type: string; listener: any; options: any }> = [];
      (window as any)[cleanupKey] = (type: string, listener: any, options: any) => {
        registeredListeners.push({ type, listener, options });
      };

      newScript.textContent = `
(function() {
  const container = window['${containerKey}'];
  if (!container) return;

  const trackListener = window['${cleanupKey}'];
  
  const scopedDocument = new Proxy(document, {
    get(target, prop) {
      if (prop === 'querySelector') {
        return (sel) => {
          if (sel === 'body' || sel === 'html') return container;
          return container.querySelector(sel);
        };
      }
      if (prop === 'querySelectorAll') {
        return (sel) => {
          if (sel === 'body' || sel === 'html') {
            return [container];
          }
          return container.querySelectorAll(sel);
        };
      }
      if (prop === 'getElementById') {
        return (id) => {
          try {
            const escapedId = id.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
            const found = container.querySelector('[id="' + escapedId + '"]');
            if (found) return found;
          } catch (e) {}
          const nativeEl = document.getElementById(id);
          if (nativeEl && container.contains(nativeEl)) {
            return nativeEl;
          }
          return null;
        };
      }
      if (prop === 'getElementsByClassName') {
        return (cls) => container.getElementsByClassName(cls);
      }
      if (prop === 'getElementsByTagName') {
        return (tag) => container.getElementsByTagName(tag);
      }
      if (prop === 'body') {
        return container;
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });

  const scopedWindow = new Proxy(window, {
    get(target, prop) {
      if (prop === 'addEventListener') {
        return (type, listener, options) => {
          if (trackListener) trackListener(type, listener, options);
          return window.addEventListener(type, listener, options);
        };
      }
      if (prop === 'document') {
        return scopedDocument;
      }
      if (prop === 'window' || prop === 'self' || prop === 'globalThis') {
        return scopedWindow;
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });

  // Execute the note script inside the scoped window/document.
  // Using parameters window/document resolves Temporal Dead Zone (TDZ) hoisting errors.
  (function(window, document) {
    try {
      ${oldScript.textContent}
    } catch (err) {
      console.error("Error executing note script:", err);
    }
  })(scopedWindow, scopedDocument);
})();
      `;
      oldScript.parentNode?.replaceChild(newScript, oldScript);

      // Register cleanup for this script's listeners
      cleanupsRef.current.push(() => {
        registeredListeners.forEach(({ type, listener, options }) => {
          window.removeEventListener(type, listener, options);
        });
        delete (window as any)[cleanupKey];
        delete (window as any)[containerKey];
      });
    });

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
