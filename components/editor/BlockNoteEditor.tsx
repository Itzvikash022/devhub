"use client";

import { useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

interface SimpleTextEditorProps {
  initialContent: string;
  onSave: (markdown: string) => Promise<void> | void;
}

export function BlockNoteEditor({ initialContent, onSave }: SimpleTextEditorProps) {
  const editor = useCreateBlockNote();
  const loadedRef = useRef(false);
  const onSaveRef = useRef(onSave);

  // Keep latest onSave ref
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const initialContentRef = useRef(initialContent);

  // Load initial content into editor blocks ONCE on mount
  useEffect(() => {
    async function loadContent() {
      const contentToLoad = initialContentRef.current;
      if (editor && contentToLoad && !loadedRef.current) {
        loadedRef.current = true;
        try {
          // Attempt markdown parse first
          const blocks = await editor.tryParseMarkdownToBlocks(contentToLoad);
          if (blocks && blocks.length > 0) {
            editor.replaceBlocks(editor.document, blocks);
          }
        } catch {
          // If JSON blocks string fallback
          try {
            const jsonBlocks = JSON.parse(contentToLoad);
            if (Array.isArray(jsonBlocks) && jsonBlocks.length > 0) {
              editor.replaceBlocks(editor.document, jsonBlocks);
            }
          } catch {}
        }
      }
    }
    loadContent();
  }, [editor]); // intentionally run once per editor instance

  const handleChange = () => {
    if (!editor) return;

    // Defer callback execution outside ProseMirror's active DOM transaction loop
    setTimeout(async () => {
      try {
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        onSaveRef.current(markdown);
      } catch (err) {
        console.warn("Error converting blocks to markdown:", err);
      }
    }, 0);
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-220px)] p-4 bg-[#F8F9F5] font-inter text-[#20221F] overflow-y-auto">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
        className="min-h-[calc(100vh-260px)] font-inter"
      />
    </div>
  );
}
