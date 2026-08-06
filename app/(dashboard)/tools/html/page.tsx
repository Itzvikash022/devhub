"use client";

import { useState, useEffect } from "react";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Code2, Copy, Trash2, FileCode, Check, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; background: #EEF0EA; padding: 24px; color: #20221F; }
    .card { background: #F8F9F5; border: 1px solid #DAD8CE; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    h1 { color: #4F46C7; margin-top: 0; font-size: 22px; }
    .badge { background: #4F46C7; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    button { background: #4F46C7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-top: 12px; }
    button:hover { background: #4338a8; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">DEVHUB TOOL</span>
    <h1>Live HTML Preview Sandbox</h1>
    <p>This is a sandboxed live preview canvas supporting HTML5, inline CSS styles, and JavaScript interactions.</p>
    <button onclick="alert('Hello from DevHub!')">Click Me</button>
  </div>
</body>
</html>`;

const LOCAL_STORAGE_KEY = "devhub_tool_html_content";

export default function HtmlToolPage() {
  usePageTitle("HTML Tools");
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
      setContent(SAMPLE_HTML);
    }
    setIsLoaded(true);
  }, []);

  // Save content to localStorage whenever changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY, content);
    }
  }, [content, isLoaded]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("HTML code copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLoadSample = () => {
    setContent(SAMPLE_HTML);
    toast.info("Sample HTML loaded.");
  };

  const handleClear = () => {
    setContent("");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    toast.info("Content cleared.");
  };

  return (
    <>
      <SetPageHeader title="HTML Previewer" />

      <div className="w-full space-y-4 p-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-[#DAD8CE] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#4F46C7]" />
            <h3 className="font-heading font-semibold text-sm text-[#20221F]">
              Sandboxed Live HTML & CSS Playground
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-inter border border-[#DAD8CE] rounded-md bg-[#F8F9F5] text-[#20221F] hover:bg-[#EEF0EA] flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy HTML"}
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
          {/* Left Code Editor (50%) */}
          <div className="flex flex-col border border-[#DAD8CE] rounded-xl overflow-hidden bg-[#F8F9F5] w-full">
            <div className="px-4 py-2 border-b border-[#DAD8CE] bg-[#EEF0EA] font-mono text-xs text-[#6B6E64] flex items-center justify-between">
              <span>HTML / CSS SOURCE</span>
              <span>{content.length} chars</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write HTML here..."
              className="flex-1 w-full p-4 font-mono text-xs text-[#20221F] bg-[#F8F9F5] border-none outline-none resize-none leading-relaxed min-h-[500px]"
            />
          </div>

          {/* Right iFrame Live Canvas (50%) */}
          <div className="flex flex-col border border-[#DAD8CE] rounded-xl overflow-hidden bg-white w-full relative">
            <div className="px-4 py-2 border-b border-[#DAD8CE] bg-[#EEF0EA] font-mono text-xs text-[#6B6E64] flex items-center justify-between">
              <span>LIVE SANDBOX PREVIEW</span>
              <button
                onClick={() => setIsFullscreen(true)}
                className="text-[#4F46C7] hover:underline flex items-center gap-1 text-[11px]"
              >
                <Maximize2 className="w-3 h-3" /> Expand
              </button>
            </div>
            {isLoaded ? (
              <iframe
                srcDoc={content}
                title="HTML Live Preview"
                sandbox="allow-scripts"
                className="flex-1 w-full h-full border-none bg-white min-h-[500px]"
              />
            ) : (
              <div className="flex-1 w-full h-full min-h-[500px] bg-white flex items-center justify-center text-xs text-[#6B6E64]">
                Loading preview...
              </div>
            )}
          </div>
        </div>

        {/* Full Screen Overlay Modal */}
        {isFullscreen && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-[#DAD8CE] bg-[#EEF0EA] flex items-center justify-between shrink-0">
              <span className="font-heading font-semibold text-base text-[#20221F] flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#4F46C7]" /> HTML Fullscreen Preview Sandbox
              </span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-md border border-[#DAD8CE] bg-white text-xs font-inter font-medium text-[#20221F] hover:bg-[#EEF0EA] flex items-center gap-1.5"
              >
                <Minimize2 className="w-3.5 h-3.5" /> Exit Fullscreen
              </button>
            </div>
            <iframe
              srcDoc={content}
              title="HTML Fullscreen Preview"
              sandbox="allow-scripts"
              className="flex-1 w-full h-full border-none bg-white"
            />
          </div>
        )}
      </div>
    </>
  );
}
