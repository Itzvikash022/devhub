"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePasswordsList, useDeletePassword, PasswordData } from "@/hooks/usePasswords";
import { useProjectsList } from "@/hooks/useProjects";
import { SetPageHeader } from "@/components/layout/SetPageHeader";
import { PasswordDialog } from "@/components/dialogs/PasswordDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes.constants";

interface PasswordVaultViewProps {
  projectId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  database: "Database",
  "api-key": "API Key",
  service: "Service",
  ssh: "SSH",
  repository: "Repository",
  hosting: "Hosting",
  cloud: "Cloud",
  personal: "Personal",
  shared: "Shared",
  other: "Other",
};

export function PasswordVaultView({ projectId }: PasswordVaultViewProps) {
  const isGlobalView = !projectId;

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search");

  useEffect(() => {
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParam]);

  // Local state to store decrypted passwords temporarily
  const [decryptedSecrets, setDecryptedSecrets] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dialog control states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PasswordData | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Fetch passwords and projects list
  const { data: passwords = [], isLoading, error } = usePasswordsList(projectId);
  const { data: projects = [] } = useProjectsList();
  const { mutate: deletePassword, isPending: isDeletePending } = useDeletePassword();

  // Custom reveal handler
  const [revealPendingId, setRevealPendingId] = useState<string | null>(null);

  const handleReveal = async (item: PasswordData) => {
    const id = item._id;
    if (decryptedSecrets[id]) {
      setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
      return;
    }

    setRevealPendingId(id);
    try {
      const res = await fetch(`/api/passwords/${id}/reveal`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setDecryptedSecrets((prev) => ({ ...prev, [id]: json.data.secret }));
        setRevealedIds((prev) => ({ ...prev, [id]: true }));
      } else {
        toast.error("Failed to decrypt secret.");
      }
    } catch {
      toast.error("Decryption request failed.");
    } finally {
      setRevealPendingId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Password copied to clipboard.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreate = () => {
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: PasswordData) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    deletePassword(itemToDelete, {
      onSuccess: () => {
        setDeleteOpen(false);
        setItemToDelete(null);
      },
    });
  };

  // Filter & Search matching
  const filteredPasswords = passwords.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === "all" ? true : item.category === filterCategory;

    const matchesProject =
      filterProject === "all"
        ? true
        : filterProject === "unlinked"
        ? !item.projectId
        : item.projectId === filterProject;

    return matchesSearch && matchesCategory && matchesProject;
  });

  const categories = Array.from(new Set(passwords.map((p) => p.category)));

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto py-12 text-center font-inter text-sm text-[#6B6E64]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4F46C7]" />
        Loading credentials...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1100px] mx-auto py-12 text-center font-inter text-sm text-[#B14B4B]">
        Failed to load password vault data.
      </div>
    );
  }

  return (
    <>
      {isGlobalView && <SetPageHeader title="Password Vault" />}

      <div className="max-w-[1100px] mx-auto">
        {/* Filters Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B6E64] shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#6B6E64] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search passwords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
            />
          </div>

          {/* Project Filter (Global view only) */}
          {isGlobalView && (
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-2.5 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
            >
              <option value="all">All projects</option>
              <option value="unlinked">Unlinked (—)</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 bg-[#F8F9F5] border border-[#DAD8CE] font-inter text-[12px] text-[#20221F] rounded-md h-8 focus:outline-none focus:border-[#4F46C7]"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>

          {/* Entries count beside filters */}
          <span className="font-mono text-[11px] text-[#6B6E64] shrink-0">
            {filteredPasswords.length} entries
          </span>

          {/* Add Password Button at far right corner */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46C7] text-white font-inter text-[13px] hover:bg-[#4338a8] transition-colors ml-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add password
          </button>
        </div>

        {/* Password Table or Empty State */}
        {filteredPasswords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-lg border border-[#DAD8CE] bg-[#F8F9F5]">
            <KeyRound className="w-10 h-10 text-[#DAD8CE] mb-3" />
            <p className="font-heading text-xl text-[#20221F] mb-1">No credentials found</p>
            <p className="font-inter text-[13px] text-[#6B6E64] mb-4">
              Try adjusting your filters or add a new credential entry.
            </p>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46C7] text-white font-inter text-[13px] hover:bg-[#4338a8] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add password
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-[#DAD8CE] bg-[#F8F9F5] overflow-hidden">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#EEF0EA] border-b border-[#DAD8CE]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Label
                  </th>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Username
                  </th>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Secret
                  </th>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                    Category
                  </th>
                  {isGlobalView && (
                    <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64]">
                      Project
                    </th>
                  )}
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#6B6E64] w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPasswords.map((pw) => {
                  const isRevealed = !!revealedIds[pw._id];
                  const secret = decryptedSecrets[pw._id] || "";
                  const project = projects.find((p) => p._id === pw.projectId);

                  return (
                    <tr
                      key={pw._id}
                      className="border-b border-[#DAD8CE] last:border-0 hover:bg-[#EEF0EA] transition-colors"
                    >
                      {/* Label */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-inter text-[13px] font-medium text-[#20221F] break-all">
                          {pw.label}
                        </p>
                        {pw.url && (
                          <a
                            href={pw.url.startsWith("http") ? pw.url : `https://${pw.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-inter text-[11px] text-[#4F46C7] hover:underline inline-flex items-center gap-0.5 mt-0.5 break-all"
                          >
                            {pw.url}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      {/* Username */}
                      <td className="px-4 py-3 font-mono text-[12px] text-[#6B6E64] break-all max-w-[150px]">
                        {pw.username || "—"}
                      </td>

                      {/* Secret */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-[#20221F] max-w-[160px] truncate break-all">
                            {revealPendingId === pw._id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-[#4F46C7]" />
                            ) : isRevealed ? (
                              secret
                            ) : (
                              "••••••••••"
                            )}
                          </span>
                          <button
                            onClick={() => handleReveal(pw)}
                            className="text-[#6B6E64] hover:text-[#4F46C7] transition-colors shrink-0"
                            title={isRevealed ? "Hide" : "Reveal"}
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isRevealed && secret && (
                            <button
                              onClick={() => handleCopy(pw._id, secret)}
                              className="text-[#6B6E64] hover:text-[#3F7A5C] transition-colors shrink-0"
                              title="Copy"
                            >
                              {copiedId === pw._id ? (
                                <Check className="w-3.5 h-3.5 text-[#3F7A5C]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] uppercase tracking-wide text-[#6B6E64] bg-[#EEF0EA] px-2 py-0.5 rounded">
                          {CATEGORY_LABELS[pw.category] || pw.category}
                        </span>
                      </td>

                      {/* Project (Global view) */}
                      {isGlobalView && (
                        <td className="px-4 py-3 font-inter text-[12px] text-[#6B6E64]">
                          {project ? (
                            <Link
                              href={ROUTES.PROJECT_PASSWORDS(project._id) as any}
                              className="text-[#4F46C7] hover:underline break-all"
                            >
                              {project.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(pw)}
                            className="text-[#6B6E64] hover:text-[#20221F] transition-colors p-1"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(pw._id)}
                            className="text-[#6B6E64] hover:text-[#B14B4B] transition-colors p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Dialogs */}
        <PasswordDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultProjectId={projectId}
          item={selectedItem}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Credential"
          description="Are you sure you want to permanently delete this password entry from the vault? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          loading={isDeletePending}
        />
      </div>
    </>
  );
}
