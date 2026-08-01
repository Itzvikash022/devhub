"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useProjectDetails,
  useProjectCustomDetails,
  useUpdateProjectCustomDetails,
} from "@/hooks/useProjects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import {
  Calendar,
  Clock,
  Info,
  User,
  Loader2,
  Edit3,
  Plus,
  Trash2,
  ExternalLink,
  Grid,
  Save,
  X,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { ProjectSection, ProjectField } from "@/hooks/useProjects";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import {
  MoveSectionsDialog,
  getEstimatedCardHeight,
} from "@/components/dialogs/MoveSectionsDialog";

function renderFieldValue(field: ProjectField) {
  switch (field.type) {
    case "link":
      const href = field.value.startsWith("http") ? field.value : `https://${field.value}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex max-w-full items-center gap-1 font-sans text-xs hover:underline break-words"
        >
          <span className="truncate">{field.value}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      );
    case "list":
      const listItems = field.value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (listItems.length === 0)
        return <span className="text-muted-foreground/60 text-xs">—</span>;
      return (
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="text-foreground font-sans text-xs break-words">
              {item}
            </li>
          ))}
        </ul>
      );
    case "tag[]":
      const tags = field.value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length === 0)
        return <span className="text-muted-foreground/60 text-xs">—</span>;
      return (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {tags.map((tag, tIdx) => (
            <Badge
              key={tIdx}
              variant="secondary"
              className="px-1.5 py-0.5 font-mono text-[9px] break-words"
            >
              {tag}
            </Badge>
          ))}
        </div>
      );
    default:
      return (
        <span className="text-foreground font-sans text-xs break-words whitespace-pre-wrap">
          {field.value || <span className="text-muted-foreground/50 italic">empty</span>}
        </span>
      );
  }
}

export default function ProjectDetailsTab() {
  const { id: projectId } = useParams() as { id: string };
  const [isEditing, setIsEditing] = useState(false);
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [editableSections, setEditableSections] = useState<ProjectSection[]>([]);

  // Queries & Mutations
  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
  } = useProjectDetails(projectId);
  const {
    data: customDetails,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useProjectCustomDetails(projectId);
  const { mutate: updateCustomDetails, isPending: isSaving } =
    useUpdateProjectCustomDetails(projectId);

  const isLoading = isProjectLoading || isDetailsLoading;
  const hasError = projectError || detailsError;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Card className="bg-card border-border border">
              <CardHeader className="space-y-2">
                <div className="bg-muted h-5 w-32 animate-pulse rounded" />
                <div className="bg-muted h-4 w-64 animate-pulse rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="bg-muted h-4 w-full animate-pulse rounded" />
                <div className="bg-muted h-4 w-full animate-pulse rounded" />
                <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted h-4 w-full animate-pulse rounded" />
                <div className="bg-muted h-4 w-full animate-pulse rounded" />
                <div className="bg-muted h-4 w-full animate-pulse rounded" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (hasError || !project) {
    return (
      <div className="text-destructive p-6 text-center">
        Failed to load project details or metadata.
      </div>
    );
  }

  const handleStartEdit = () => {
    if (customDetails) {
      setEditableSections(
        customDetails.sections.map((sec) => ({
          heading: sec.heading,
          fields: sec.fields.map((f) => ({ ...f })),
        }))
      );
    } else {
      setEditableSections([]);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (customDetails) {
      setEditableSections(customDetails.sections || []);
    }
    setIsEditing(false);
  };

  const handleSave = () => {
    // Validate
    for (let sIdx = 0; sIdx < editableSections.length; sIdx++) {
      const sec = editableSections[sIdx];
      if (!sec.heading.trim()) {
        toast.error(`Section ${sIdx + 1} has an empty heading.`);
        return;
      }
      for (let fIdx = 0; fIdx < sec.fields.length; fIdx++) {
        const field = sec.fields[fIdx];
        if (!field.key.trim()) {
          toast.error(`Field ${fIdx + 1} in section "${sec.heading}" has an empty key.`);
          return;
        }
      }
    }

    updateCustomDetails(
      { sections: editableSections },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  // State mutation actions
  const addSection = () => {
    setEditableSections([...editableSections, { heading: "New Section", fields: [] }]);
  };

  const removeSection = (index: number) => {
    setEditableSections(editableSections.filter((_, i) => i !== index));
  };

  const updateSectionHeading = (index: number, heading: string) => {
    setEditableSections(
      editableSections.map((sec, i) => (i === index ? { ...sec, heading } : sec))
    );
  };

  const addField = (secIndex: number) => {
    setEditableSections(
      editableSections.map((sec, i) => {
        if (i === secIndex) {
          return {
            ...sec,
            fields: [...sec.fields, { key: "New Field", value: "", type: "text" }],
          };
        }
        return sec;
      })
    );
  };

  const removeField = (secIndex: number, fieldIndex: number) => {
    setEditableSections(
      editableSections.map((sec, i) => {
        if (i === secIndex) {
          return {
            ...sec,
            fields: sec.fields.filter((_, fIdx) => fIdx !== fieldIndex),
          };
        }
        return sec;
      })
    );
  };

  const updateField = (
    secIndex: number,
    fieldIndex: number,
    prop: keyof ProjectField,
    val: string
  ) => {
    setEditableSections(
      editableSections.map((sec, i) => {
        if (i === secIndex) {
          return {
            ...sec,
            fields: sec.fields.map((f, fIdx) => {
              if (fIdx === fieldIndex) {
                return { ...f, [prop]: val };
              }
              return f;
            }),
          };
        }
        return sec;
      })
    );
  };

  // Compute identical shortest-column 2-column distribution for 1:1 layout match with modal
  const allSections = customDetails?.sections || [];
  const col1: ProjectSection[] = [];
  const col2: ProjectSection[] = [];
  const colHeights = [0, 0];

  allSections.forEach((sec) => {
    const h = getEstimatedCardHeight(sec);
    if (colHeights[0] <= colHeights[1]) {
      col1.push(sec);
      colHeights[0] += h + 24;
    } else {
      col2.push(sec);
      colHeights[1] += h + 24;
    }
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header controls for details tab */}
      <div className="border-border/55 flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="font-heading text-foreground text-xl font-semibold">Structured Details</h2>
          <p className="text-muted-foreground text-xs">
            {isEditing
              ? "Configure custom metadata headings and fields."
              : "Workspace technical references and dynamic attributes."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              {allSections.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMoveDialogOpen(true)}
                  className="h-8 gap-1.5 text-xs text-[#4F46C7] border-[#4F46C7]/30 hover:bg-[#4F46C7]/10"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Move Sections
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                Edit Details
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        /* ─── EDIT MODE ─── */
        <div className="space-y-6">
          {editableSections.length === 0 ? (
            <Card className="border-border bg-card/20 border border-dashed py-12 text-center">
              <CardContent className="space-y-3">
                <Grid className="text-muted-foreground/60 mx-auto h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  No sections exist yet. Create a custom section to start adding key-value
                  references.
                </p>
                <Button size="sm" variant="outline" onClick={addSection}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add First Section
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {editableSections.map((sec, secIndex) => (
                <Card key={secIndex} className="bg-card border-border border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div className="max-w-md flex-1">
                      <Input
                        value={sec.heading}
                        onChange={(e) => updateSectionHeading(secIndex, e.target.value)}
                        placeholder="Section Heading (e.g. Tech Stack)"
                        className="font-heading bg-background text-lg font-semibold"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(secIndex)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      title="Remove section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sec.fields.length === 0 ? (
                      <p className="text-muted-foreground bg-muted/10 rounded-md border border-dashed py-4 text-center text-xs">
                        No fields in this section. Add one below.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-muted-foreground grid hidden grid-cols-12 gap-2 px-1 font-mono text-xs md:grid">
                          <span className="col-span-3">Key / Label</span>
                          <span className="col-span-2">Type</span>
                          <span className="col-span-6">Value</span>
                        </div>
                        {sec.fields.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="grid grid-cols-12 items-start gap-2">
                            {/* Key Input */}
                            <div className="col-span-12 md:col-span-3">
                              <Input
                                value={field.key}
                                onChange={(e) =>
                                  updateField(secIndex, fieldIndex, "key", e.target.value)
                                }
                                placeholder="Key (e.g. Framework)"
                                className="bg-background h-9 text-xs"
                              />
                            </div>

                            {/* Type Dropdown */}
                            <div className="col-span-12 md:col-span-2">
                              <select
                                value={field.type}
                                onChange={(e) =>
                                  updateField(
                                    secIndex,
                                    fieldIndex,
                                    "type",
                                    e.target.value as "text" | "list" | "link" | "tag[]"
                                  )
                                }
                                className="border-input bg-background text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-2.5 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                              >
                                <option value="text">Text</option>
                                <option value="link">Link</option>
                                <option value="list">List (lines)</option>
                                <option value="tag[]">Tags (comma)</option>
                              </select>
                            </div>

                            {/* Value Input / Textarea */}
                            <div className="col-span-11 md:col-span-6">
                              {field.type === "list" ? (
                                <Textarea
                                  value={field.value}
                                  onChange={(e) =>
                                    updateField(secIndex, fieldIndex, "value", e.target.value)
                                  }
                                  placeholder="Enter items, one per line..."
                                  className="bg-background h-[38px] min-h-[38px] resize-y px-3 py-1.5 text-xs"
                                />
                              ) : (
                                <Input
                                  value={field.value}
                                  onChange={(e) =>
                                    updateField(secIndex, fieldIndex, "value", e.target.value)
                                  }
                                  placeholder={
                                    field.type === "link"
                                      ? "https://example.com"
                                      : field.type === "tag[]"
                                        ? "react, nextjs, tailwind"
                                        : "Value"
                                  }
                                  className="bg-background h-9 text-xs"
                                />
                              )}
                            </div>

                            {/* Delete Field */}
                            <div className="col-span-1 flex justify-end pt-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeField(secIndex, fieldIndex)}
                                className="text-muted-foreground hover:text-destructive h-7 w-7"
                                title="Remove field"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Field Trigger */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addField(secIndex)}
                        className="h-8 gap-1 border-dashed text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Field
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-center pt-2">
                <Button type="button" variant="outline" onClick={addSection} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add New Section
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── READ MODE ─── */
        <div className="space-y-6">
          {/* Top Row: About Project and Workspace Metadata side-by-side */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
            {/* About Project Card (takes 2 columns) */}
            <Card className="bg-card border-border border md:col-span-2 flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="font-heading text-base font-semibold">
                      About Project
                    </CardTitle>
                    <CardDescription>General workspace summary and details.</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectEditOpen(true)}
                    className="h-8 gap-1 text-xs"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit About
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {project.description ||
                      'No project description provided. Click "Edit About" above to add one.'}
                  </p>
                </CardContent>
              </div>
            </Card>

            {/* Workspace Metadata Card (takes 1 column) */}
            <Card className="bg-card border-border border flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-base font-semibold">
                    Workspace Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-3 font-mono text-xs">
                  <div className="border-border/50 flex items-center gap-2 border-b pb-2">
                    <Info className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="text-foreground font-semibold">Status:</span>
                    <span className="ml-auto">
                      <ProjectStatusBadge status={project.status} />
                    </span>
                  </div>
                  <div className="border-border/50 flex items-center gap-2 border-b pb-2">
                    <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="text-foreground font-semibold">Created:</span>
                    <span className="ml-auto">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="border-border/50 flex items-center gap-2 border-b pb-2">
                    <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="text-foreground font-semibold">Updated:</span>
                    <span className="ml-auto">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="text-foreground font-semibold">ID:</span>
                    <span className="ml-auto max-w-[120px] truncate" title={project._id}>
                      {project._id}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>

          {/* 1:1 Identical Masonry Layout Engine matching Modal Preview */}
          {allSections.length === 0 ? (
            <Card className="bg-card border-border border">
              <CardContent className="p-0">
                <EmptyState
                  icon={Grid}
                  title="No structured details"
                  description="Configure custom metadata columns like Tech Stack, Server Configurations, or Client Contact Info."
                  action={{
                    label: "Add details",
                    onClick: handleStartEdit,
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Column 1 */}
              <div className="space-y-6">
                {col1.map((section, idx) => (
                  <Card key={idx} className="bg-card border-border border">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-heading text-base font-semibold">
                        {section.heading}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {section.fields.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic">
                          No fields in this section.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#DAD8CE]/60">
                          {section.fields.map((field, fIdx) => (
                            <div key={fIdx} className="py-3 first:pt-0 last:pb-0 space-y-1">
                              <span className="text-muted-foreground block font-mono text-[10px] font-semibold tracking-wider uppercase">
                                {field.key}
                              </span>
                              <div>{renderFieldValue(field)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Column 2 */}
              <div className="space-y-6">
                {col2.map((section, idx) => (
                  <Card key={idx} className="bg-card border-border border">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-heading text-base font-semibold">
                        {section.heading}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {section.fields.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic">
                          No fields in this section.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#DAD8CE]/60">
                          {section.fields.map((field, fIdx) => (
                            <div key={fIdx} className="py-3 first:pt-0 last:pb-0 space-y-1">
                              <span className="text-muted-foreground block font-mono text-[10px] font-semibold tracking-wider uppercase">
                                {field.key}
                              </span>
                              <div>{renderFieldValue(field)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Edit Dialog */}
      <ProjectDialog
        open={projectEditOpen}
        onOpenChange={setProjectEditOpen}
        project={{
          id: project._id,
          name: project.name,
          description: project.description,
          status: project.status,
        }}
      />

      {/* Reorder / Move Sections Dialog */}
      <MoveSectionsDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        projectId={projectId}
        sections={allSections}
      />
    </div>
  );
}
