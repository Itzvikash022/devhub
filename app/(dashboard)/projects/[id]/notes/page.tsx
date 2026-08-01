"use client";

import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export default function NotesIndexPage() {
  return (
    <div className="bg-background/50 flex h-full items-center justify-center p-8">
      <EmptyState
        icon={FileText}
        title="No page selected"
        description="Select an existing documentation page from the sidebar or click 'New Page' to create a new one."
      />
    </div>
  );
}
