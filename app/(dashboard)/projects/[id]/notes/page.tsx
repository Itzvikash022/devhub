"use client";

import { FileText, Plus, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCreateNote, useNotesList } from "@/hooks/useNotes";

export default function NotesIndexPage() {
  const { id: projectId } = useParams() as { id: string };
  const router = useRouter();
  const { data: notes = [] } = useNotesList(projectId);
  const { mutate: createNote, isPending } = useCreateNote(projectId);

  const handleAdd = () => {
    createNote(
      {
        title: "Untitled Page",
        content: "## Overview\n\nStart writing notes or specifications here...",
        order: notes.length,
      },
      {
        onSuccess: (newNote) => {
          router.push(`/projects/${projectId}/notes/${newNote._id}`);
        },
      }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <FileText className="w-10 h-10 text-[#DAD8CE] mb-3" />
      <p className="font-heading text-xl text-[#20221F] mb-1">
        {notes.length === 0 ? "No notes yet" : "Select a note"}
      </p>
      <p className="font-inter text-[13px] text-[#6B6E64] mb-4">
        {notes.length === 0
          ? "Add your first note page to start documenting."
          : "Select a documentation page from the list to view or edit."}
      </p>
      <button
        onClick={handleAdd}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46C7] text-white font-inter text-[13px] hover:bg-[#4338a8] transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
        New note
      </button>
    </div>
  );
}
