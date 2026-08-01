import { z } from "zod";

export const projectFieldSchema = z.object({
  key: z
    .string()
    .min(1, "Field key is required")
    .max(100, "Field key cannot exceed 100 characters"),
  value: z.string().max(1000, "Field value cannot exceed 1000 characters").default(""),
  type: z.enum(["text", "list", "link", "tag[]"]),
});

export const projectSectionSchema = z.object({
  heading: z
    .string()
    .min(1, "Section heading is required")
    .max(100, "Section heading cannot exceed 100 characters"),
  fields: z.array(projectFieldSchema).default([]),
});

export const updateProjectDetailSchema = z.object({
  sections: z.array(projectSectionSchema),
});

export type ProjectFieldInput = z.infer<typeof projectFieldSchema>;
export type ProjectSectionInput = z.infer<typeof projectSectionSchema>;
export type UpdateProjectDetailInput = z.infer<typeof updateProjectDetailSchema>;
