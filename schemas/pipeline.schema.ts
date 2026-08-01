import { z } from "zod";

export const createPipelineItemSchema = z.object({
  category: z.enum([
    "repository",
    "hosting",
    "domain",
    "database",
    "storage",
    "monitoring",
    "analytics",
    "ci-cd",
    "api",
    "docs",
    "other",
  ]),
  label: z
    .string()
    .min(1, "Label is required")
    .max(100, "Label cannot exceed 100 characters")
    .trim(),
  url: z.string().min(1, "URL is required").max(500, "URL cannot exceed 500 characters").trim(),
  environment: z
    .preprocess((val) => (val === "" ? null : val), z.enum(["production", "staging", "development"]).nullable())
    .optional()
    .default(null),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().default(""),
});

export const updatePipelineItemSchema = createPipelineItemSchema.partial();

export type CreatePipelineItemInput = z.infer<typeof createPipelineItemSchema>;
export type UpdatePipelineItemInput = z.infer<typeof updatePipelineItemSchema>;
