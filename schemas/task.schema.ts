import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .default(""),
  status: z.enum(["todo", "in-progress", "blocked", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z
    .preprocess((val) => (val ? new Date(val as string) : null), z.date().nullable())
    .optional()
    .default(null),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createCommentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment text is required")
    .max(500, "Comment cannot exceed 500 characters"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
