"use client";

import { useParams } from "next/navigation";
import { DocumentVaultView } from "@/components/shared/DocumentVaultView";

export default function ProjectDocumentsTab() {
  const { id: projectId } = useParams() as { id: string };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Tab Header */}
      <div className="border-border/55 flex flex-col gap-1 border-b pb-4">
        <h2 className="font-heading text-foreground text-xl font-semibold">Project Documents</h2>
        <p className="text-muted-foreground text-xs">
          Manage system specs, requirement sheets, and architecture docs associated with this
          project.
        </p>
      </div>

      {/* Filtered Vault View */}
      <DocumentVaultView projectId={projectId} />
    </div>
  );
}
