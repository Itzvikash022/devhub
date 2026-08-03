"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNoteDetails, useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import { Loader2, Trash2, Edit3, Type, FileCode, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MarkdownViewer } from "@/components/shared/MarkdownViewer";
import { Editor } from "@/components/editor/Editor";

export default function ActiveNotePage() {
  const { id: projectId, noteId } = useParams() as { id: string; noteId: string };
  const router = useRouter();

  const { data: note, isLoading, error } = useNoteDetails(noteId);
  const { mutate: updateNote, isPending: isSaving } = useUpdateNote(noteId, projectId);
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteNote(noteId, projectId);

  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [editorType, setEditorType] = useState<"markdown" | "simple">("simple");
  const [renderMode, setRenderMode] = useState<"auto" | "markdown" | "html">("auto");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state with backend details when loaded
  useEffect(() => {
    if (note) {
      setTitle(note.title || "Untitled Page");
      setContent(note.content || "");
    }
  }, [note]);

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

  const handleSave = () => {
    updateNote(
      {
        title: title.trim() || "Untitled Page",
        content,
      },
      {
        onSuccess: () => {
          setMode("preview");
          toast.success("Note saved successfully.");
        },
      }
    );
  };

  const handleCancel = () => {
    if (note) {
      setTitle(note.title || "Untitled Page");
      setContent(note.content || "");
    }
    setMode("preview");
  };

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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8F9F5]">
      {/* Header Toolbar matching UI Ref */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#DAD8CE] bg-[#F8F9F5] shrink-0">
        {mode === "edit" ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-heading text-[20px] font-medium text-[#20221F] bg-transparent border-none outline-none flex-1 mr-4"
            placeholder="Note title..."
          />
        ) : (
          <h2 className="font-heading text-[20px] font-medium text-[#20221F]">{title}</h2>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {/* Editor Mode Selector (Simple Text / Raw Markdown) during Edit Mode */}
          {mode === "edit" && (
            <div className="flex items-center border border-[#DAD8CE] rounded-md overflow-hidden text-[11px] font-inter">
              <button
                type="button"
                onClick={() => setEditorType("simple")}
                className={`px-2.5 py-1 flex items-center gap-1.5 transition-colors ${
                  editorType === "simple"
                    ? "bg-[#4F46C7] text-white font-medium"
                    : "text-[#6B6E64] hover:bg-[#EEF0EA]"
                }`}
                title="Simple Text Editor with / slash commands"
              >
                <Type className="w-3.5 h-3.5" />
                Simple Text
              </button>
              <button
                type="button"
                onClick={() => setEditorType("markdown")}
                className={`px-2.5 py-1 flex items-center gap-1.5 transition-colors ${
                  editorType === "markdown"
                    ? "bg-[#4F46C7] text-white font-medium"
                    : "text-[#6B6E64] hover:bg-[#EEF0EA]"
                }`}
                title="Raw Markdown / Code Editor"
              >
                <FileCode className="w-3.5 h-3.5" />
                Raw Markdown
              </button>
            </div>
          )}

          {/* View Mode Switcher (Auto / Markdown / HTML) during Preview Mode */}
          {mode === "preview" && (
            <div className="flex items-center border border-[#DAD8CE] rounded-md overflow-hidden text-[11px] font-inter">
              <button
                onClick={() => setRenderMode("auto")}
                className={`px-2 py-0.5 transition-colors ${
                  renderMode === "auto"
                    ? "bg-[#4F46C7] text-white font-medium"
                    : "text-[#6B6E64] hover:bg-[#EEF0EA]"
                }`}
                title="Auto detect format"
              >
                Auto
              </button>
              <button
                onClick={() => setRenderMode("markdown")}
                className={`px-2 py-0.5 transition-colors ${
                  renderMode === "markdown"
                    ? "bg-[#4F46C7] text-white font-medium"
                    : "text-[#6B6E64] hover:bg-[#EEF0EA]"
                }`}
                title="Force Markdown rendering"
              >
                MD
              </button>
              <button
                onClick={() => setRenderMode("html")}
                className={`px-2 py-0.5 transition-colors ${
                  renderMode === "html"
                    ? "bg-[#4F46C7] text-white font-medium"
                    : "text-[#6B6E64] hover:bg-[#EEF0EA]"
                }`}
                title="Force HTML rendering"
              >
                HTML
              </button>
            </div>
          )}

          <span className="font-mono text-[11px] text-[#6B6E64]">
            {format(new Date(note.updatedAt || note.createdAt), "yyyy-MM-dd")}
          </span>

          {mode === "preview" ? (
            <div className="flex items-center gap-1.5">
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
              <button
                onClick={() => setMode("edit")}
                className="px-3 py-1 rounded-md border border-[#DAD8CE] font-inter text-[12px] text-[#6B6E64] hover:text-[#20221F] hover:border-[#4F46C7] transition-colors flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="p-1 rounded-md border border-[#DAD8CE] text-[#6B6E64] hover:text-[#B14B4B] hover:border-[#B14B4B] transition-colors"
                title="Delete page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-1 rounded-md border border-[#DAD8CE] font-inter text-[12px] text-[#6B6E64] hover:text-[#20221F] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
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
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {mode === "edit" ? (
          editorType === "simple" ? (
            <Editor initialContent={content} onSave={async (m) => setContent(m)} />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full h-full min-h-[calc(100vh-220px)] p-6 font-mono text-[13px] text-[#20221F] bg-[#F8F9F5] border-none outline-none resize-none leading-relaxed break-words"
              placeholder="Write in Markdown or paste HTML — supports tables, ```mermaid``` diagrams, code blocks, checklists..."
            />
          )
        ) : (
          <div className="p-8">
            <MarkdownViewer
              content={content}
              mode={renderMode}
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
