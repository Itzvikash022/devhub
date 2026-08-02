"use client";

import { ImageVaultView } from "@/components/shared/ImageVaultView";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function GlobalImagesPage() {
  usePageTitle("Image Vault");
  return (
    <div className="p-6">
      <ImageVaultView />
    </div>
  );
}
