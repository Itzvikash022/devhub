"use client";

import { PasswordVaultView } from "@/components/shared/PasswordVaultView";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useActiveProject } from "@/components/layout/ActiveProjectContext";

export default function GlobalPasswordsPage() {
  const { activeProjectId } = useActiveProject();
  usePageTitle(activeProjectId ? "Passwords" : "Password Vault");
  return (
    <div className="p-6">
      <PasswordVaultView projectId={activeProjectId ?? undefined} />
    </div>
  );
}
