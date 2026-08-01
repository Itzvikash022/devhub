"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Load BlockNoteEditor dynamically with SSR disabled to prevent Prosemirror server errors.
export const Editor = dynamic(() => import("./BlockNoteEditor").then((m) => m.BlockNoteEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full flex-col">
      <div className="border-border bg-muted/20 text-muted-foreground flex items-center justify-end border-b px-6 py-1.5 font-mono text-xs select-none">
        <span className="flex items-center gap-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading editor...
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    </div>
  ),
});
