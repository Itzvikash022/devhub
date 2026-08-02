"use client";

import { DocumentVaultView } from "@/components/shared/DocumentVaultView";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function GlobalDocumentsPage() {
  usePageTitle("Doc Vault");
  return (
    <div className="p-6">
      <DocumentVaultView />
    </div>
  );
}
