"use client";

import { useState, useEffect } from "react";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { MarkdownViewer } from "@/components/shared/MarkdownViewer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FileCode, Copy, Trash2, FileText, Check, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_MARKDOWN = `# DevHub Technical Specification

## Overview
DevHub is a high-performance developer workspace designed for single-user productivity.

| Feature | Status | Priority |
| :--- | :---: | ---: |
| Password Vault | ✅ Ready | High |
| Document Vault | ✅ Ready | High |
| Image Vault | ✅ Ready | Medium |
| Whiteboard & Tools | 🚀 Active | High |

## Architecture Flowchart
\`\`\`mermaid
flowchart TD
  User([User Browser]) -->|JWT Auth| API[Next.js Server Actions]
  API -->|Mongoose| DB[(MongoDB Atlas)]
  API -->|S3 Protocol| R2[(Cloudflare R2 Storage)]
\`\`\`

## Code Snippet
\`\`\`ts
interface ProjectMetadata {
  id: string;
  name: string;
  tags: string[];
}
\`\`\`
`;

const LOCAL_STORAGE_KEY = "devhub_tool_markdown_content";

export default function MarkdownToolPage() {
  usePageTitle("MD Preview");
  const [content, setContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cached content on mount
  useEffect(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached !== null) {
      setContent(cached);
    } else {
      setContent(SAMPLE_MARKDOWN);
    }
    setIsLoaded(true);
  }, []);

  // Save content to localStorage whenever changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY, content);
    }
  }, [content, isLoaded]);

  const handleCopyMd = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Markdown copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLoadSample = () => {
    setContent(SAMPLE_MARKDOWN);
    toast.info("Sample template loaded.");
  };

  const handleClear = () => {
    setContent("");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    toast.info("Content cleared.");
  };

  return (
    <>
      <SetPageHeader title="Markdown Previewer" />

      <div className="w-full space-y-4 p-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-[#DAD8CE] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#4F46C7]" />
            <h3 className="font-heading font-semibold text-sm text-[#20221F]">
              Live Markdown & Mermaid Sandbox
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMd}
              className="px-2.5 py-1 text-xs font-inter border border-[#DAD8CE] rounded-md bg-[#F8F9F5] text-[#20221F] hover:bg-[#EEF0EA] flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy MD"}
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1 text-xs font-inter border border-[#DAD8CE] rounded-md bg-[#F8F9F5] text-[#6B6E64] hover:text-[#B14B4B] hover:border-[#B14B4B] flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* 50 / 50 Equal Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-200px)] w-full">
          {/* Left Editor Pane (50%) */}
          <div className="flex flex-col border border-[#DAD8CE] rounded-xl overflow-hidden bg-[#F8F9F5] w-full">
            <div className="px-4 py-2 border-b border-[#DAD8CE] bg-[#EEF0EA] font-mono text-xs text-[#6B6E64] flex items-center justify-between">
              <span>MARKDOWN INPUT</span>
              <span>{content.length} chars</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type or paste Markdown here..."
              className="flex-1 w-full p-4 font-mono text-xs text-[#20221F] bg-[#F8F9F5] border-none outline-none resize-none leading-relaxed min-h-[500px]"
            />
          </div>

          {/* Right Live Preview Pane (50%) */}
          <div className="flex flex-col border border-[#DAD8CE] rounded-xl overflow-hidden bg-[#F8F9F5] w-full relative">
            <div className="px-4 py-2 border-b border-[#DAD8CE] bg-[#EEF0EA] font-mono text-xs text-[#6B6E64] flex items-center justify-between">
              <span>LIVE PREVIEW</span>
              <button
                onClick={() => setIsFullscreen(true)}
                className="text-[#4F46C7] hover:underline flex items-center gap-1 text-[11px]"
              >
                <Maximize2 className="w-3 h-3" /> Expand
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-[#F8F9F5]">
              <MarkdownViewer content={content} />
            </div>
          </div>
        </div>

        {/* Full Screen Overlay Modal */}
        {isFullscreen && (
          <div className="fixed inset-0 z-50 bg-[#F8F9F5] flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-[#DAD8CE] bg-[#EEF0EA] flex items-center justify-between shrink-0">
              <span className="font-heading font-semibold text-base text-[#20221F] flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#4F46C7]" /> Markdown Fullscreen Preview
              </span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-md border border-[#DAD8CE] bg-white text-xs font-inter font-medium text-[#20221F] hover:bg-[#EEF0EA] flex items-center gap-1.5"
              >
                <Minimize2 className="w-3.5 h-3.5" /> Exit Fullscreen
              </button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto bg-[#F8F9F5] max-w-5xl mx-auto w-full">
              <MarkdownViewer content={content} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
