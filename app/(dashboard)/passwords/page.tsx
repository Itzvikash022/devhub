"use client";

import { PasswordVaultView } from "@/components/shared/PasswordVaultView";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function GlobalPasswordsPage() {
  usePageTitle("Password Vault");
  return (
    <div className="p-6">
      <PasswordVaultView />
    </div>
  );
}
