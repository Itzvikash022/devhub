"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Copy,
  Check,
  Search,
  Download,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  name: string;
  category: string;
  sizeStr: string;
  dateStr: string;
  fileType: string;
  onDownload: () => void;
}

function escapeRegex(string: string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function formatJSONHighlight(jsonText: string) {
  const escaped = jsonText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-amber-600 dark:text-amber-400"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-purple-600 dark:text-purple-400 font-semibold"; // key
        } else {
          cls = "text-emerald-600 dark:text-emerald-400"; // string value
        }
      } else if (/true|false/.test(match)) {
        cls = "text-blue-600 dark:text-blue-400"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-red-500 dark:text-red-400"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function formatYAMLHighlight(yamlText: string) {
  const escaped = yamlText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("#")) {
        return `<span class="text-zinc-400 dark:text-zinc-500 italic">${line}</span>`;
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx);
        const val = line.substring(colonIdx);
        return `<span class="text-purple-600 dark:text-purple-400 font-semibold">${key}</span><span class="text-emerald-600 dark:text-emerald-400">${val}</span>`;
      }
      return line;
    })
    .join("\n");
}

function formatLogHighlight(logText: string) {
  const escaped = logText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split("\n")
    .map((line) => {
      if (/error|fail|critical|exception/i.test(line)) {
        return `<span class="text-red-600 dark:text-red-400 font-medium">${line}</span>`;
      }
      if (/warn|alert/i.test(line)) {
        return `<span class="text-amber-600 dark:text-amber-400 font-medium">${line}</span>`;
      }
      if (/success|info|debug/i.test(line)) {
        return `<span class="text-emerald-600 dark:text-emerald-400">${line}</span>`;
      }
      return line;
    })
    .join("\n");
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  src,
  name,
  category,
  sizeStr,
  dateStr,
  fileType,
  onDownload,
}: DocumentPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const extension = name.split(".").pop()?.toLowerCase() || "";

  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension);
  const isPDF = extension === "pdf";
  const isMarkdown = extension === "md";
  const isCSV = extension === "csv";
  const isCode = ["json", "yaml", "yml", "txt", "log", "env", "conf", "ini", "properties"].includes(extension);

  const shouldFetchText = isMarkdown || isCSV || isCode;

  useEffect(() => {
    if (!open) return;
    if (!shouldFetchText) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setTextContent("");

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load document content.");
        return res.text();
      })
      .then((text) => {
        setTextContent(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "An error occurred while reading file content.");
        setLoading(false);
      });
  }, [open, src, shouldFetchText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success("Content copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const getCodeHighlightedHtml = () => {
    let html = textContent;
    if (extension === "json") {
      html = formatJSONHighlight(textContent);
    } else if (extension === "yaml" || extension === "yml") {
      html = formatYAMLHighlight(textContent);
    } else if (extension === "log") {
      html = formatLogHighlight(textContent);
    } else {
      html = textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    if (searchTerm.trim() !== "") {
      const escapedQuery = escapeRegex(searchTerm);
      const searchRegex = new RegExp(`(${escapedQuery})`, "gi");
      html = html.replace(
        searchRegex,
        `<mark class="bg-yellow-200 dark:bg-yellow-800 text-foreground px-0.5 rounded">$1</mark>`
      );
    }

    return html;
  };

  const renderCSVTable = () => {
    const lines = textContent.split("\n").map((line) => {
      const row: string[] = [];
      let insideQuote = false;
      let currentCell = "";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === "," && !insideQuote) {
          row.push(currentCell.trim());
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      row.push(currentCell.trim());
      return row;
    });

    const validRows = lines.filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
    if (validRows.length === 0) {
      return <p className="text-muted-foreground text-xs text-center py-6">Empty CSV spreadsheet.</p>;
    }

    const headers = validRows[0];
    const bodyRows = validRows.slice(1);

    return (
      <div className="overflow-auto w-full max-h-[62vh] border border-border rounded-lg bg-card">
        <table className="w-full text-[11px] border-collapse font-sans text-left">
          <thead className="bg-muted text-muted-foreground font-semibold border-b sticky top-0">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="p-2.5 border-r border-border/60 last:border-none whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-border/40 last:border-none hover:bg-muted/30">
                {headers.map((_, cIdx) => {
                  const val = row[cIdx] || "";
                  return (
                    <td
                      key={cIdx}
                      className="p-2.5 border-r border-border/40 last:border-none max-w-xs truncate whitespace-nowrap text-foreground"
                      title={val}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getMarkdownHtml = (): { __html: string } => {
    try {
      const result = marked.parse(textContent, { async: false });
      return { __html: typeof result === "string" ? result : `<pre>${textContent}</pre>` };
    } catch {
      return { __html: `<pre>${textContent}</pre>` };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl lg:!max-w-6xl !w-[95vw] max-h-[95vh] flex flex-col p-6 animate-in zoom-in-95 duration-200">
        {/* Header Details */}
        <DialogHeader className="border-b border-border/30 pb-3 flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <DialogTitle className="text-sm font-semibold truncate max-w-[500px] text-left">
              {name}
            </DialogTitle>
            <div className="flex gap-2 text-[10px] text-muted-foreground font-mono uppercase">
              <span>{category}</span>
              <span>• {sizeStr}</span>
              <span>• {dateStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mr-6">
            {shouldFetchText && !loading && !error && (
              <>
                {isCode && (
                  <div className="relative h-8 w-44">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-1 bg-muted/40 border border-border text-[11px] font-sans rounded h-8 focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
                {isCode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="h-8 w-8"
                    title="Copy to Clipboard"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onDownload}
              className="h-8 w-8 text-primary"
              title="Download Original"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport Content */}
        <div className="bg-muted/10 border border-border/40 relative grid h-[80vh] flex-1 overflow-hidden rounded-lg">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Reading content...</p>
            </div>
          ) : error ? (
            <div className="text-center p-6 text-red-500 max-w-md">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : isImage ? (
            <div className="relative h-full w-full flex items-center justify-center">
              <img src={src} alt={name} className="max-h-[60vh] max-w-full rounded object-contain" />
            </div>
          ) : isPDF ? (
            <iframe
              src={`${src}#view=FitH&toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              style={{ display: "block", minHeight: 0 }}
              title={name}
            />
          ) : isMarkdown ? (
            <div
              className="w-full h-full overflow-y-auto px-6 py-4 text-left prose prose-sm dark:prose-invert max-w-none font-sans"
              dangerouslySetInnerHTML={getMarkdownHtml()}
            />
          ) : isCSV ? (
            renderCSVTable()
          ) : isCode ? (
            <div className="w-full h-full overflow-y-auto font-mono text-[11px] p-4 text-left bg-zinc-950 dark:bg-zinc-950 text-zinc-300 rounded-md select-text">
              <pre className="whitespace-pre overflow-x-auto leading-relaxed">
                <code dangerouslySetInnerHTML={{ __html: getCodeHighlightedHtml() }} />
              </pre>
            </div>
          ) : (
            <div className="text-center py-16 px-6 max-w-md flex flex-col items-center">
              <FileText className="h-12 w-12 text-muted-foreground/60 mb-3 stroke-[1.2]" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Preview Unsupported</h3>
              <p className="text-xs text-muted-foreground mb-4">
                This document format does not support direct in-browser rendering. Please download the file to view its contents.
              </p>
              <Button type="button" size="sm" onClick={onDownload}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
