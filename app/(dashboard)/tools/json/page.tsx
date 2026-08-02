"use client";

import { useState, useEffect } from "react";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Braces, Copy, Trash2, CheckCircle2, AlertTriangle, Check, Minimize2, Maximize2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_JSON = `{
  "app": "DevHub",
  "version": "2.0.0",
  "features": [
    "Password Vault",
    "Document Vault",
    "Image Vault",
    "Developer Tools Suite",
    "Excalidraw Whiteboard"
  ],
  "settings": {
    "theme": "light",
    "autoSave": true,
    "maxSizeMb": 25
  },
  "activeProjects": 3
}`;

const LOCAL_STORAGE_KEY = "devhub_tool_json_content";

export default function JsonToolPage() {
  usePageTitle("JSON Tools");
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cached content on mount
  useEffect(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached !== null) {
      setContent(cached);
    } else {
      setContent(SAMPLE_JSON);
    }
    setIsLoaded(true);
  }, []);

  // Save content to localStorage whenever changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY, content);
    }
  }, [content, isLoaded]);

  const handlePrettify = () => {
    if (!content.trim()) return;
    try {
      const parsed = JSON.parse(content);
      const pretty = JSON.stringify(parsed, null, 2);
      setContent(pretty);
      setError(null);
      toast.success("JSON prettified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON syntax");
      toast.error("Invalid JSON format.");
    }
  };

  const handleMinify = () => {
    if (!content.trim()) return;
    try {
      const parsed = JSON.parse(content);
      const mini = JSON.stringify(parsed);
      setContent(mini);
      setError(null);
      toast.success("JSON minified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON syntax");
      toast.error("Invalid JSON format.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("JSON copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setContent("");
    setError(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    toast.info("Content cleared.");
  };

  return (
    <>
      <SetPageHeader title="JSON Formatter & Validator" />

      <div className="w-full space-y-4 p-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between border-b border-[#DAD8CE] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Braces className="w-4 h-4 text-[#4F46C7]" />
            <h3 className="font-heading font-semibold text-sm text-[#20221F]">
              JSON Prettifier & Validator
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrettify}
              className="px-2.5 py-1 text-xs font-inter border border-[#DAD8CE] rounded-md bg-[#4F46C7] text-white hover:bg-[#4338a8] flex items-center gap-1 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Prettify
            </button>
            <button
              onClick={handleMinify}
              className="px-2.5 py-1 text-xs font-inter border border-[#DAD8CE] rounded-md bg-[#F8F9F5] text-[#20221F] hover:bg-[#EEF0EA] flex items-center gap-1 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Minify
            </button>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-inter border border-[#DAD8CE] rounded-md bg-[#F8F9F5] text-[#20221F] hover:bg-[#EEF0EA] flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1 text-xs font-inter border border-[#DAD8CE] rounded-md bg-[#F8F9F5] text-[#6B6E64] hover:text-[#B14B4B] hover:border-[#B14B4B] flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* Validation Banner */}
        {error ? (
          <div className="p-3 bg-[#B14B4B]/10 border border-[#B14B4B]/30 rounded-lg text-xs font-mono text-[#B14B4B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Invalid JSON: {error}</span>
          </div>
        ) : content.trim() ? (
          <div className="p-2.5 bg-[#3F7A5C]/10 border border-[#3F7A5C]/30 rounded-lg text-xs font-mono text-[#3F7A5C] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Valid JSON Document</span>
          </div>
        ) : null}

        {/* 50 / 50 Equal Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-250px)] w-full">
          {/* Left Editor (50%) */}
          <div className="flex flex-col border border-[#DAD8CE] rounded-xl overflow-hidden bg-[#F8F9F5] w-full">
            <div className="px-4 py-2 border-b border-[#DAD8CE] bg-[#EEF0EA] font-mono text-xs text-[#6B6E64] flex items-center justify-between">
              <span>RAW JSON INPUT</span>
              <span>{content.length} chars</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setError(null); }}
              placeholder="Paste unformatted or raw JSON string..."
              className="flex-1 w-full p-4 font-mono text-xs text-[#20221F] bg-[#F8F9F5] border-none outline-none resize-none leading-relaxed min-h-[500px]"
            />
          </div>

          {/* Right Formatted Output (50%) */}
          <div className="flex flex-col border border-[#DAD8CE] rounded-xl overflow-hidden bg-[#EEF0EA] w-full">
            <div className="px-4 py-2 border-b border-[#DAD8CE] bg-[#EEF0EA] font-mono text-xs text-[#6B6E64]">
              FORMATTED OUTPUT
            </div>
            <pre className="flex-1 p-4 font-mono text-xs text-[#20221F] bg-[#F8F9F5] overflow-y-auto leading-relaxed border-none min-h-[500px]">
              <code>{content}</code>
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
