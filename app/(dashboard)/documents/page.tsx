"use client";

import { DocumentVaultView } from "@/components/shared/DocumentVaultView";

export default function GlobalDocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Page Header */}
      <div className="border-border/55 flex flex-col gap-1 border-b pb-4">
        <h1 className="font-heading text-foreground text-2xl font-bold">Document Vault</h1>
        <p className="text-muted-foreground text-sm">
          Securely organize requirement specifications, contract agreements, and architecture briefs
          across all projects.
        </p>
      </div>

      {/* Global Vault View */}
      <DocumentVaultView />
    </div>
  );
}
