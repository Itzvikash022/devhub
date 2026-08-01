import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const createNoteSchema = z.object({
  title: z.string().max(100, "Title cannot exceed 100 characters").trim().default("Untitled"),
  content: z.string().default("[]"),
  order: z.number().int().nonnegative().default(0),
});

export const updateNoteSchema = z.object({
  title: z.string().max(100, "Title cannot exceed 100 characters").trim().optional(),
  content: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const reorderItemSchema = z.object({
  id: objectIdSchema,
  order: z.number().int().nonnegative(),
});

export const reorderNotesSchema = z.array(reorderItemSchema);

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ReorderNotesInput = z.infer<typeof reorderNotesSchema>;
