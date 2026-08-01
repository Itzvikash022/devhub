import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name cannot exceed 100 characters")
    .trim(),
  description: z.string().max(500, "Description cannot exceed 500 characters").trim(),
  status: z.enum(["active", "on-hold", "archived"]),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
