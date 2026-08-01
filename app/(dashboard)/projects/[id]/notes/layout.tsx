"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { FileText, Plus, Search, GripVertical, Trash2, Loader2, FolderClosed } from "lucide-react";
import { useNotesList, useCreateNote, useDeleteNote, useReorderNotes } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NotesLayoutProps {
  children: React.ReactNode;
}

export default function NotesLayout({ children }: NotesLayoutProps) {
  const { id, noteId } = useParams() as { id: string; noteId?: string };
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");

  // Drag and drop local state indices
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Queries & Mutations
  const { data: notes = [], isLoading } = useNotesList(id);
  const { mutate: createNote, isPending: isCreatePending } = useCreateNote(id);
  const { mutate: reorderNotes } = useReorderNotes(id);
  const { mutate: deleteNote } = useDeleteNote(noteId || "", id);

  // Filter notes based on search query
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePage = () => {
    createNote({
      title: "Untitled Page",
      content: "[]",
      order: notes.length > 0 ? notes[notes.length - 1].order + 1 : 0,
    });
  };

  // ─── Drag & Drop Reordering handlers ───────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    // Rearrange items locally
    const reorderedList = [...notes];
    const [draggedItem] = reorderedList.splice(draggedIndex, 1);
    reorderedList.splice(targetIndex, 0, draggedItem);

    // Map new sequence indices (0, 1, 2...)
    const newOrderPayload = reorderedList.map((item, idx) => ({
      id: item._id,
      order: idx,
    }));

    // Trigger api mutation (updates TanStack cache optimistically)
    reorderNotes(newOrderPayload);
    setDraggedIndex(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden md:flex-row">
      {/* Left Notes Sub-Sidebar */}
      <aside className="border-border bg-card/45 flex h-64 w-full shrink-0 flex-col border-b md:h-full md:w-60 md:border-r md:border-b-0">
        {/* Search & Actions bar */}
        <div className="border-border shrink-0 space-y-2 border-b p-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
            <Input
              placeholder="Search pages..."
              className="bg-background h-8 pl-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            onClick={handleCreatePage}
            disabled={isCreatePending}
            className="h-8 w-full justify-center gap-1 text-xs"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Page
          </Button>
        </div>

        {/* Notes Pages List */}
        <div className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-xs">
              {searchQuery ? "No matching pages" : "No pages yet"}
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const active = noteId === note._id;
              return (
                <div
                  key={note._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    "cursor-pointer"
                  )}
                >
                  {/* Grip handler for reordering */}
                  <div className="cursor-grab opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing">
                    <GripVertical className="h-3.5 w-3.5 shrink-0" />
                  </div>

                  {/* Page Anchor Link */}
                  <Link
                    href={`/projects/${id}/notes/${note._id}`}
                    className="flex-1 truncate py-0.5 select-none"
                  >
                    {note.title || "Untitled Page"}
                  </Link>

                  {/* Page Delete trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (confirm("Delete this page?")) {
                        if (noteId === note._id) {
                          deleteNote();
                        } else {
                          // If deleting a non-active page, trigger deletion directly
                          fetch(`/api/notes/${note._id}`, { method: "DELETE" }).then(() => {
                            router.refresh();
                          });
                        }
                      }
                    }}
                    className="hover:text-destructive rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    title="Delete page"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Page Content */}
      <div className="h-full flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
