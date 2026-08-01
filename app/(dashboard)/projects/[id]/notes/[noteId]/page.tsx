"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useNoteDetails, useUpdateNote } from "@/hooks/useNotes";
import { Editor } from "@/components/editor/Editor";
import { Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ActiveNotePage() {
  const { id: projectId, noteId } = useParams() as { id: string; noteId: string };

  const { data: note, isLoading, error } = useNoteDetails(noteId);
  const { mutateAsync: updateNote } = useUpdateNote(noteId, projectId);

  const [title, setTitle] = useState("");

  // Sync state title with backend details when loaded
  useEffect(() => {
    if (note) {
      setTitle(note.title);
    }
  }, [note]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <AlertCircle className="text-destructive h-8 w-8" />
        <p className="text-sm font-medium">Failed to load note page</p>
        <p className="text-xs">Make sure you have access rights or try reloading.</p>
      </div>
    );
  }

  const handleTitleBlur = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle !== note.title) {
      await updateNote({ title: trimmedTitle });
    } else {
      setTitle(note.title); // Reset on empty or unchanged
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleSaveContent = async (contentString: string) => {
    await updateNote({ content: contentString });
  };

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Title Input Area */}
      <div className="shrink-0 px-6 pt-5 pb-3">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled Page"
          className="hover:bg-muted/30 font-heading h-auto w-full rounded-none border-none bg-transparent px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 overflow-hidden">
        <Editor initialContent={note.content} onSave={handleSaveContent} />
      </div>
    </div>
  );
}
