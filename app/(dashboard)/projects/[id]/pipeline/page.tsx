"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { usePipelineList, useDeletePipelineItem, PipelineItemData } from "@/hooks/usePipeline";
import { EmptyState } from "@/components/shared/EmptyState";
import { PipelineItemDialog } from "@/components/dialogs/PipelineItemDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GitBranch,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
  GitFork,
  Server,
  Globe,
  Database,
  HardDrive,
  Activity,
  BarChart3,
  Terminal,
  Cpu,
  BookOpen,
  HelpCircle,
} from "lucide-react";

// Category mappings for labels
const CATEGORY_LABELS: Record<string, string> = {
  repository: "Repositories",
  hosting: "Hosting Providers",
  domain: "Domains & URLs",
  database: "Databases & Engines",
  storage: "Asset Storage",
  monitoring: "Monitoring Consoles",
  analytics: "Analytics Dashboards",
  "ci-cd": "CI/CD Pipelines",
  api: "API Gateways / Endpoints",
  docs: "Documentation Pages",
  other: "Other Infrastructure",
};

// Category mappings for icons
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  repository: GitFork,
  hosting: Server,
  domain: Globe,
  database: Database,
  storage: HardDrive,
  monitoring: Activity,
  analytics: BarChart3,
  "ci-cd": Terminal,
  api: Cpu,
  docs: BookOpen,
  other: HelpCircle,
};

// Environment badge style mappings
const ENV_BADGE_CLASSES: Record<string, string> = {
  production:
    "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50/80 font-mono text-[9px] px-1 py-0 h-4 uppercase",
  staging:
    "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50/80 font-mono text-[9px] px-1 py-0 h-4 uppercase",
  development:
    "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50/80 font-mono text-[9px] px-1 py-0 h-4 uppercase",
};

export default function PipelineTab() {
  const { id: projectId } = useParams() as { id: string };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PipelineItemData | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Queries & Mutations
  const { data: items = [], isLoading, error } = usePipelineList(projectId);
  const { mutate: deleteItem, isPending: isDeletePending } = useDeletePipelineItem(projectId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between pb-3">
          <div className="bg-muted h-6 w-36 animate-pulse rounded" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="bg-muted border-border h-40 animate-pulse rounded-lg border" />
          <div className="bg-muted border-border h-40 animate-pulse rounded-lg border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-6 text-center">
        Failed to load deployment pipeline workspace.
      </div>
    );
  }

  const handleOpenCreate = () => {
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: PipelineItemData) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    deleteItem(itemToDelete, {
      onSuccess: () => {
        setDeleteOpen(false);
        setItemToDelete(null);
      },
    });
  };

  // Group items by category (only include categories that have items)
  const groupedItems: Record<string, PipelineItemData[]> = {};
  items.forEach((item) => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  // Ensure fixed ordering for categories
  const sortedCategories = Object.keys(groupedItems).sort();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header controls */}
      <div className="border-border/55 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-foreground text-xl font-semibold">Pipeline Tracker</h2>
          <p className="text-muted-foreground text-xs">
            Monitor repos, hosting environments, endpoints, and storage assets.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          New Resource
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="bg-card border-border border">
          <CardContent className="p-0">
            <EmptyState
              icon={GitBranch}
              title="No infrastructure resources yet"
              description="Store active server hosts, API portals, databases, or repos. Create your first resource card."
              action={{
                label: "Add Resource",
                onClick: handleOpenCreate,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {sortedCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category] || HelpCircle;
            const categoryItems = groupedItems[category] || [];

            return (
              <Card
                key={category}
                className="bg-card border-border/60 flex flex-col border shadow-sm"
              >
                <CardHeader className="border-border/40 bg-muted/5 border-b pb-3">
                  <CardTitle className="text-muted-foreground flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase">
                    <Icon className="text-primary/75 h-4 w-4" />
                    {CATEGORY_LABELS[category] || category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                  <div className="space-y-4">
                    {categoryItems.map((item) => (
                      <div
                        key={item._id}
                        className="group hover:border-border/30 hover:bg-muted/15 flex items-start justify-between gap-4 rounded-md border border-transparent p-2 transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-foreground truncate font-sans text-sm font-semibold">
                              {item.label}
                            </span>
                            {item.environment && (
                              <Badge
                                variant="outline"
                                className={
                                  ENV_BADGE_CLASSES[item.environment] ||
                                  "h-4 px-1 py-0 font-mono text-[9px]"
                                }
                              >
                                {item.environment}
                              </Badge>
                            )}
                          </div>

                          <a
                            href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex max-w-full items-center gap-1 truncate font-mono text-xs hover:underline"
                          >
                            {item.url}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>

                          {item.notes && (
                            <p className="text-muted-foreground bg-muted/10 border-border/30 mt-1 rounded border p-1.5 font-sans text-xs leading-relaxed">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="text-muted-foreground hover:text-foreground h-7 w-7"
                            title="Edit resource"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(item._id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                            title="Delete resource"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pipeline Item Dialog */}
      <PipelineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        item={selectedItem}
      />

      {/* Confirm Deletion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Resource Reference"
        description="Are you sure you want to permanently delete this infrastructure resource link? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={isDeletePending}
      />
    </div>
  );
}
