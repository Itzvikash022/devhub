import { z } from "zod";

export const createCalendarEventSchema = z.object({
  title: z
    .string()
    .min(1, "Event title is required")
    .max(100, "Title cannot exceed 100 characters")
    .trim(),
  date: z.preprocess((val) => new Date(val as string), z.date()),
  type: z.enum(["personal", "milestone", "deadline", "meeting", "release"]),
  projectId: z.string().nullable().optional().default(null),
});

export const updateCalendarEventSchema = z.object({
  title: z
    .string()
    .min(1, "Event title is required")
    .max(100, "Title cannot exceed 100 characters")
    .trim()
    .optional(),
  date: z.preprocess((val) => new Date(val as string), z.date()).optional(),
  type: z.enum(["personal", "milestone", "deadline", "meeting", "release"]).optional(),
  projectId: z.string().nullable().optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
