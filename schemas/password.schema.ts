import { z } from "zod";

export const createPasswordSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(100, "Label cannot exceed 100 characters")
    .trim(),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username cannot exceed 100 characters")
    .trim(),
  secret: z
    .string()
    .min(1, "Password/Secret is required")
    .max(200, "Password/Secret cannot exceed 200 characters"),
  url: z.string().max(500, "URL cannot exceed 500 characters").nullable().optional().default(null),
  category: z.enum([
    "repository",
    "hosting",
    "database",
    "api",
    "cloud",
    "personal",
    "shared",
    "utility",
    "other",
  ]),
  projectId: z.string().nullable().optional().default(null),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().default(""),
});

export const updatePasswordSchema = createPasswordSchema.partial();

export type CreatePasswordInput = z.infer<typeof createPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
