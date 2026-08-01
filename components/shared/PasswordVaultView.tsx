"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePasswordsList, useDeletePassword, PasswordData } from "@/hooks/usePasswords";
import { useProjectsList } from "@/hooks/useProjects";
import { EmptyState } from "@/components/shared/EmptyState";
import { PasswordDialog } from "@/components/dialogs/PasswordDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Key,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface PasswordVaultViewProps {
  projectId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  repository: "Repository",
  hosting: "Hosting",
  database: "Database",
  api: "API Endpoint",
  cloud: "Cloud / AWS",
  personal: "Personal",
  shared: "Shared",
  utility: "Utility",
  other: "Other",
};

export function PasswordVaultView({ projectId }: PasswordVaultViewProps) {
  const isGlobalView = !projectId;

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

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

  // Custom reveal mutation handler
  const [revealPendingId, setRevealPendingId] = useState<string | null>(null);

  const handleReveal = async (item: PasswordData) => {
    const id = item._id;
    // Toggle if already decrypted
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3">
          <div className="bg-muted h-6 w-36 animate-pulse rounded" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded" />
        </div>
        <Card className="bg-card border-border border">
          <CardContent className="space-y-4 py-12">
            <div className="bg-muted h-8 w-full animate-pulse rounded" />
            <div className="bg-muted h-8 w-full animate-pulse rounded" />
            <div className="bg-muted h-8 w-full animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive py-6 text-center">
        Failed to load secure password vault data.
      </div>
    );
  }

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
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeCategory === "all" ? true : item.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and action bar */}
      <div className="bg-card border-border flex flex-col justify-between gap-3 rounded-md border p-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-md">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search passwords..."
            className="h-9 pl-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-36 rounded-md border px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <Button size="sm" onClick={handleOpenCreate} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            New Password
          </Button>
        </div>
      </div>

      {passwords.length === 0 ? (
        <Card className="bg-card border-border border">
          <CardContent className="p-0">
            <EmptyState
              icon={Key}
              title="No credentials stored yet"
              description="Store passwords, API access keys, and cloud credentials. Data is GCM-encrypted at rest."
              action={{
                label: "Add Password",
                onClick: handleOpenCreate,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 bg-muted/10 border-b hover:bg-transparent">
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Service Label
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Username
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Secret / Password
                </TableHead>
                {isGlobalView && (
                  <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                    Linked Project
                  </TableHead>
                )}
                <TableHead className="font-mono text-[10px] font-semibold tracking-wider">
                  Category
                </TableHead>
                <TableHead className="w-24 text-right font-mono text-[10px] font-semibold tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPasswords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isGlobalView ? 6 : 5}
                    className="text-muted-foreground py-8 text-center text-xs"
                  >
                    No matching passwords.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPasswords.map((item) => {
                  const isRevealed = !!revealedIds[item._id];
                  const secret = decryptedSecrets[item._id] || "";
                  const project = projects.find((p) => p._id === item.projectId);

                  return (
                    <TableRow key={item._id} className="border-border/50 border-b">
                      {/* Label & URL */}
                      <TableCell className="py-4 align-middle">
                        <div className="flex min-w-0 flex-col">
                          <span className="text-foreground truncate text-sm font-semibold">
                            {item.label}
                          </span>
                          {item.url && (
                            <a
                              href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary inline-flex items-center gap-0.5 truncate font-mono text-[10px] hover:underline"
                            >
                              {item.url}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>

                      {/* Username */}
                      <TableCell className="text-foreground py-4 align-middle font-mono text-xs font-medium">
                        {item.username}
                      </TableCell>

                      {/* Secret Mask / Reveal Toggle */}
                      <TableCell className="py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground bg-muted/20 border-border/30 inline-block min-w-28 rounded border px-2 py-1 text-center font-mono text-xs tracking-wide select-all">
                            {revealPendingId === item._id ? (
                              <Loader2 className="text-primary mx-auto h-3 w-3 animate-spin" />
                            ) : isRevealed ? (
                              secret
                            ) : (
                              "••••••••"
                            )}
                          </span>

                          {/* Reveal eye action */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReveal(item)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-7 w-7"
                            disabled={revealPendingId === item._id}
                            title={isRevealed ? "Hide password" : "Show password"}
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Copy clipboard action */}
                          {isRevealed && secret && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(item._id, secret)}
                              className="text-muted-foreground h-7 w-7 hover:bg-emerald-50/10 hover:text-emerald-600"
                              title="Copy to clipboard"
                            >
                              {copiedId === item._id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Linked Project (Global page only) */}
                      {isGlobalView && (
                        <TableCell className="py-4 align-middle">
                          {project ? (
                            <Badge
                              variant="outline"
                              className="text-primary border-primary/20 max-w-28 truncate bg-transparent font-mono text-[9px] uppercase"
                            >
                              {project.name}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground border-border bg-transparent font-mono text-[9px] uppercase"
                            >
                              <Lock className="mr-0.5 h-2 w-2" /> Global
                            </Badge>
                          )}
                        </TableCell>
                      )}

                      {/* Category */}
                      <TableCell className="py-4 align-middle">
                        <span className="text-muted-foreground bg-muted/65 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </TableCell>

                      {/* Item Actions */}
                      <TableCell className="py-3 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8"
                            title="Edit credential"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(item._id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            title="Delete credential"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Password Edit / Create Dialog */}
      <PasswordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultProjectId={projectId}
        item={selectedItem}
      />

      {/* Delete Confirmation */}
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
  );
}
