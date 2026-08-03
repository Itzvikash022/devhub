"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNoteDetails, useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import { Loader2, Trash2, Copy, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MarkdownViewer } from "@/components/shared/MarkdownViewer";
import { Editor } from "@/components/editor/Editor";
import { marked } from "marked";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function ActiveNotePage() {
  const { id: projectId, noteId } = useParams() as { id: string; noteId: string };
  const router = useRouter();

  const { data: note, isLoading, error } = useNoteDetails(noteId);
  const { mutate: updateNote, isPending: isSaving } = useUpdateNote(noteId, projectId);
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteNote(noteId, projectId);

  const [mode, setMode] = useState<"preview" | "edit-raw" | "edit-simple">("preview");
  const [rawTab, setRawTab] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync state with backend details when loaded
  useEffect(() => {
    if (note) {
      setTitle(note.title || "Untitled Page");
      setContent(note.content || "");
    }
  }, [note]);

  const handleDelete = () => {
    deleteNote(undefined, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push(`/projects/${projectId}/notes`);
      },
    });
  };

  const handleCopyPage = () => {
    const fullText = `# ${title}\n\n${content}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("Note page copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const isHtmlContent = (text: string): boolean => {
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

  const handleDoubleClickPreview = () => {
    if (isHtmlContent(content)) {
      toast.error(
        "You cannot edit HTML files in the visual editor. Please click 'Edit Raw' in the toolbar."
      );
    } else {
      setMode("edit-simple");
    }
  };

  const handleExport = (format: "txt" | "md" | "html") => {
    let fileContent = "";
    let mimeType = "text/plain";
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`;

    if (format === "txt") {
      fileContent = `Title: ${title}\n\n${content}`;
      mimeType = "text/plain";
    } else if (format === "md") {
      fileContent = `# ${title}\n\n${content}`;
      mimeType = "text/markdown";
    } else if (format === "html") {
      if (isHtmlContent(content)) {
        fileContent = content;
      } else {
        const parsedHtml = marked.parse(content) as string;
        fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      color: #20221F;
      background-color: #F8F9F5;
    }
    h1, h2, h3, h4 { color: #111; font-weight: 600; }
    h1 { border-bottom: 1px solid #DAD8CE; padding-bottom: 10px; }
    pre { background: #EEF0EA; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: monospace; background: #EEF0EA; padding: 2px 4px; border-radius: 4px; font-size: 0.9em; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #DAD8CE; padding: 8px; text-align: left; }
    th { background-color: #EEF0EA; }
    blockquote { border-left: 4px solid #4F46C7; padding-left: 16px; margin: 20px 0; color: #6B6E64; font-style: italic; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${parsedHtml}</div>
</body>
</html>`;
      }
      mimeType = "text/html";
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Note exported as ${format.toUpperCase()}`);
  };

  const handleManualSave = () => {
    const currentTitle = title.trim() || "Untitled Page";
    const hasChanges =
      currentTitle !== (note?.title || "Untitled Page") || content !== (note?.content || "");

    if (hasChanges) {
      updateNote(
        {
          title: currentTitle,
          content,
        },
        {
          onSuccess: () => {
            toast.success("Note saved successfully.");
          },
        }
      );
    }
    setMode("preview");
  };

  // Auto-save on click outside or Escape
  useEffect(() => {
    if (mode === "preview") return;

    const saveChanges = () => {
      const currentTitle = title.trim() || "Untitled Page";
      const hasChanges =
        currentTitle !== (note?.title || "Untitled Page") || content !== (note?.content || "");

      if (hasChanges) {
        updateNote(
          {
            title: currentTitle,
            content,
          },
          {
            onSuccess: () => {
              toast.success("Note saved successfully.");
            },
          }
        );
      }
      setMode("preview");
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Do not auto-save if click is inside dialogs, dropdowns, portals, or toasts
      if (
        target.closest('[role="dialog"]') ||
        target.closest('[data-radix-portal]') ||
        target.closest('.sonner') ||
        target.closest('[role="presentation"]') ||
        target.closest('[data-slot="dropdown-menu-content"]')
      ) {
        return;
      }

      if (editorRef.current && !editorRef.current.contains(target)) {
        saveChanges();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        saveChanges();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, title, content, note, updateNote]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24 text-center font-inter text-sm text-[#6B6E64]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4F46C7]" />
        Loading note...
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center font-inter text-sm text-[#B14B4B]">
        Failed to load note page.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8F9F5]" ref={editorRef}>
      {/* Header Toolbar matching UI Ref */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#DAD8CE] bg-[#F8F9F5] shrink-0">
        {mode !== "preview" ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-heading text-[20px] font-medium text-[#20221F] bg-transparent border-none outline-none flex-1 mr-4 border-b border-dashed border-[#DAD8CE] focus:border-[#4F46C7] pb-0.5"
            placeholder="Note title..."
          />
        ) : (
          <h2
            className="font-heading text-[20px] font-medium text-[#20221F] select-none cursor-text"
            onDoubleClick={handleDoubleClickPreview}
            title="Double-click to edit visually"
          >
            {title}
          </h2>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {isSaving && (
            <span className="flex items-center gap-1 font-inter text-[11px] text-[#6B6E64] animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-[#4F46C7]" />
              Saving...
            </span>
          )}

          {mode === "edit-raw" && (
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="px-3 py-1 rounded-md bg-[#4F46C7] text-white font-inter text-[12px] hover:bg-[#4338a8] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          )}

          <span className="font-mono text-[11px] text-[#6B6E64]">
            {format(new Date(note.updatedAt || note.createdAt), "yyyy-MM-dd")}
          </span>

          {mode === "preview" && (
            <>
              <button
                onClick={() => setMode("edit-raw")}
                className="px-3 py-1 rounded-md border border-[#DAD8CE] font-inter text-[12px] text-[#6B6E64] hover:text-[#20221F] hover:border-[#4F46C7] transition-colors flex items-center gap-1"
                title="Edit raw markdown or HTML source"
              >
                Edit Raw
              </button>

              <button
                onClick={handleCopyPage}
                className="px-3 py-1 rounded-md border border-[#DAD8CE] font-inter text-[12px] text-[#6B6E64] hover:text-[#20221F] hover:border-[#4F46C7] transition-colors flex items-center gap-1"
                title="Copy entire page content"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#3F7A5C]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="px-3 py-1 rounded-md border border-[#DAD8CE] font-inter text-[12px] text-[#6B6E64] hover:text-[#20221F] hover:border-[#4F46C7] transition-colors flex items-center gap-1">
                  Export
                  <ChevronDown className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[120px] bg-white border border-[#DAD8CE] rounded-md shadow-md p-1">
                  <DropdownMenuItem
                    className="px-2 py-1.5 text-xs text-[#20221F] hover:bg-[#EEF0EA] rounded cursor-pointer transition-colors"
                    onClick={() => handleExport("txt")}
                  >
                    Text (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="px-2 py-1.5 text-xs text-[#20221F] hover:bg-[#EEF0EA] rounded cursor-pointer transition-colors"
                    onClick={() => handleExport("md")}
                  >
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="px-2 py-1.5 text-xs text-[#20221F] hover:bg-[#EEF0EA] rounded cursor-pointer transition-colors"
                    onClick={() => handleExport("html")}
                  >
                    HTML (.html)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <button
            onClick={() => setDeleteOpen(true)}
            className="p-1 rounded-md border border-[#DAD8CE] text-[#6B6E64] hover:text-[#B14B4B] hover:border-[#B14B4B] transition-colors"
            title="Delete page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {mode === "edit-raw" ? (
          <div className="flex-1 flex flex-col">
            {/* Raw Edit Mode Tabs */}
            <div className="flex border-b border-[#DAD8CE] bg-[#F8F9F5] px-8 py-2 shrink-0 gap-4 text-xs font-inter font-medium text-[#6B6E64]">
              <button
                type="button"
                onClick={() => setRawTab("write")}
                className={`pb-1 border-b-2 transition-colors ${
                  rawTab === "write"
                    ? "border-[#4F46C7] text-[#20221F]"
                    : "border-transparent hover:text-[#20221F]"
                }`}
              >
                Raw Editor
              </button>
              <button
                type="button"
                onClick={() => setRawTab("preview")}
                className={`pb-1 border-b-2 transition-colors ${
                  rawTab === "preview"
                    ? "border-[#4F46C7] text-[#20221F]"
                    : "border-transparent hover:text-[#20221F]"
                }`}
              >
                Preview
              </button>
            </div>

            {rawTab === "write" ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full h-full min-h-[calc(100vh-250px)] p-8 font-mono text-[13px] text-[#20221F] bg-[#F8F9F5] border-none outline-none resize-none leading-relaxed break-words"
                placeholder="Write in Markdown or paste HTML — supports tables, ```mermaid``` diagrams, code blocks, checklists..."
                autoFocus
              />
            ) : (
              <div className="p-8 min-h-full">
                <MarkdownViewer
                  content={content}
                  mode="auto"
                  className="max-w-[900px] min-h-[400px]"
                />
              </div>
            )}
          </div>
        ) : mode === "edit-simple" ? (
          <Editor initialContent={content} onSave={setContent} />
        ) : (
          <div
            className="p-8 cursor-text min-h-full"
            onDoubleClick={handleDoubleClickPreview}
            title="Double-click anywhere to edit visually"
          >
            <MarkdownViewer
              content={content}
              mode="auto"
              className="max-w-[900px] min-h-[400px]"
            />
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Page"
        description={`Are you sure you want to delete "${title}"? This page will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
}
