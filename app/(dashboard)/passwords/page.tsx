"use client";

import { PasswordVaultView } from "@/components/shared/PasswordVaultView";

export default function GlobalPasswordsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Page Header */}
      <div className="border-border/55 flex flex-col gap-1 border-b pb-4">
        <h1 className="font-heading text-foreground text-2xl font-bold">Password Vault</h1>
        <p className="text-muted-foreground text-sm">
          Securely manage all database credentials, service keys, and access tokens at rest.
        </p>
      </div>

      {/* Vault Table Dashboard */}
      <PasswordVaultView />
    </div>
  );
}
