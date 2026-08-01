"use client";

import { useParams } from "next/navigation";
import { PasswordVaultView } from "@/components/shared/PasswordVaultView";

export default function ProjectPasswordsTab() {
  const { id: projectId } = useParams() as { id: string };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Workspace Header */}
      <div className="border-border/55 flex flex-col gap-1 border-b pb-4">
        <h2 className="font-heading text-foreground text-xl font-semibold">
          Project Password Vault
        </h2>
        <p className="text-muted-foreground text-xs">
          Manage development passwords and credentials associated with this project workspace.
        </p>
      </div>

      {/* Vault Table Pre-filtered */}
      <PasswordVaultView projectId={projectId} />
    </div>
  );
}
