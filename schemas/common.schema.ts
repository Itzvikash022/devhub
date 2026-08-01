import { z } from "zod";

// ─── Common Schemas ───────────────────────────────────────────────────────────

/** Validates a MongoDB ObjectId string (24 hex characters) */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

/** Pagination query parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
