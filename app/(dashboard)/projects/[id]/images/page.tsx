"use client";

import { useParams } from "next/navigation";
import { ImageVaultView } from "@/components/shared/ImageVaultView";

export default function ProjectImagesTab() {
  const { id: projectId } = useParams() as { id: string };
  return (
    <div className="p-6">
      <ImageVaultView projectId={projectId} />
    </div>
  );
}
