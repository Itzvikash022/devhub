"use client";

import { useEffect, useState, useRef, useTransition, useMemo } from "react";
import { BlockNoteEditor as CoreBlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { Check, Loader2, AlertCircle } from "lucide-react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

interface BlockNoteEditorProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
}

export function BlockNoteEditor({ initialContent, onSave }: BlockNoteEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [, startTransition] = useTransition();

  // Parse initial content safely once
  const parsedContent = useMemo(() => {
    try {
      const parsed = initialContent ? JSON.parse(initialContent) : undefined;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [initialContent]);

  // Initialize editor
  const editor: CoreBlockNoteEditor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  // Track save timeout reference
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger autosave when content changes
  const handleContentChange = () => {
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentBlocks = editor.document;
      const contentString = JSON.stringify(currentBlocks);

      startTransition(async () => {
        try {
          await onSave(contentString);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      });
    }, 1000); // 1-second debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Editor Save Status Header bar */}
      <div className="border-border bg-muted/20 text-muted-foreground flex items-center justify-end border-b px-6 py-1.5 font-mono text-xs select-none">
        {saveStatus === "saving" && (
          <span className="text-primary flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving changes...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1 text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Saved to cloud
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Autosave failed
          </span>
        )}
      </div>

      {/* Editor Workspace */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <BlockNoteView editor={editor} onChange={handleContentChange} className="min-h-[300px]" />
      </div>
    </div>
  );
}
