"use client";

import { ImageVaultView } from "@/components/shared/ImageVaultView";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useActiveProject } from "@/components/layout/ActiveProjectContext";

export default function GlobalImagesPage() {
  const { activeProjectId } = useActiveProject();
  usePageTitle(activeProjectId ? "Images" : "Image Vault");
  return (
    <div className="p-6">
      <ImageVaultView projectId={activeProjectId ?? undefined} />
    </div>
  );
}
