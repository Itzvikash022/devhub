"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileText, Plus, Search, Loader2, Download } from "lucide-react";
import { useNotesList, useCreateNote } from "@/hooks/useNotes";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface NotesLayoutProps {
  children: React.ReactNode;
}

export default function NotesLayout({ children }: NotesLayoutProps) {
  const { id, noteId } = useParams() as { id: string; noteId?: string };
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("order");

  // Queries & Mutations
  const { data: notes = [], isLoading } = useNotesList(id);
  const { mutate: createNote, isPending: isCreatePending } = useCreateNote(id);

  // Auto-redirect to first note if on index route `/projects/[id]/notes`
  useEffect(() => {
    if (!noteId && notes.length > 0) {
      router.replace(`/projects/${id}/notes/${notes[0]._id}`);
    }
  }, [noteId, notes, id, router]);

  // Filter notes based on search query
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort notes list
  const sortedAndFilteredNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === "title-asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "title-desc") {
      return b.title.localeCompare(a.title);
    }
    if (sortBy === "updated-desc") {
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    }
    if (sortBy === "updated-asc") {
      return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
    }
    // Default: order
    return a.order - b.order;
  });

  const handleCreatePage = () => {
    createNote(
      {
        title: "Untitled Page",
        content: "## Overview\n\nStart writing notes or specifications here...",
        order: notes.length > 0 ? notes[notes.length - 1].order + 1 : 0,
      },
      {
        onSuccess: (newNote) => {
          router.push(`/projects/${id}/notes/${newNote._id}`);
        },
      }
    );
  };



  return (
    <div className="flex h-full overflow-hidden bg-[#EEF0EA]">
      {/* Left Pages Sub-Sidebar matching UI Ref */}
      <aside className="w-56 shrink-0 border-r border-[#DAD8CE] bg-[#EEF0EA] flex flex-col h-full">
        {/* Pages Header & Add Button */}
        <div className="p-3 border-b border-[#DAD8CE] flex items-center justify-between gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6E64] truncate">
            Pages ({notes.length})
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCreatePage}
              disabled={isCreatePending}
              className="text-[#6B6E64] hover:text-[#4F46C7] transition-colors p-1"
              title="New Page"
            >
              {isCreatePending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Search & Sort Input */}
        <div className="px-3 py-2 border-b border-[#DAD8CE]/60 space-y-2">
          <div className="relative">
            <Search className="w-3 h-3 text-[#6B6E64] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-7 focus:outline-none focus:border-[#4F46C7]"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full h-7 px-2 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[11px] text-[#6B6E64] rounded-md focus:outline-none focus:border-[#4F46C7]"
          >
            <option value="order">Order (Default)</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="updated-desc">Updated (Newest)</option>
            <option value="updated-asc">Updated (Oldest)</option>
          </select>
        </div>

        {/* Pages List */}
        <ul className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-4 h-4 animate-spin text-[#4F46C7]" />
            </div>
          ) : sortedAndFilteredNotes.length === 0 ? (
            <div className="text-center py-10 font-inter text-[12px] text-[#6B6E64]">
              {searchQuery ? "No matching pages" : "No pages yet"}
            </div>
          ) : (
            sortedAndFilteredNotes.map((note) => {
              const active = noteId === note._id;
              return (
                <li key={note._id}>
                  <Link
                    href={`/projects/${id}/notes/${note._id}`}
                    className={cn(
                      "w-full text-left px-3 py-2 flex items-start gap-2 transition-colors border-l-2",
                      active
                        ? "bg-[#F8F9F5] text-[#20221F] border-[#4F46C7] font-medium"
                        : "text-[#6B6E64] hover:bg-[#F8F9F5] hover:text-[#20221F] border-transparent"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-inter text-[13px] truncate">{note.title || "Untitled"}</p>
                      <p className="font-mono text-[10px] text-[#6B6E64]">
                        {format(new Date(note.updatedAt || note.createdAt), "MM-dd")}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* Right Content View / Editor */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9F5]">{children}</div>
    </div>
  );
}
