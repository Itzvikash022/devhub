"use client";

import { DocumentVaultView } from "@/components/shared/DocumentVaultView";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useActiveProject } from "@/components/layout/ActiveProjectContext";

export default function GlobalDocumentsPage() {
  const { activeProjectId } = useActiveProject();
  usePageTitle(activeProjectId ? "Documents" : "Doc Vault");
  return (
    <div className="p-6">
      <DocumentVaultView projectId={activeProjectId ?? undefined} />
    </div>
  );
}
