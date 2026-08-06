import { z } from "zod";

export const presignDocumentSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
});

export const confirmDocumentSchema = z.object({
  r2Key: z.string().optional().default(""),
  title: z
    .string()
    .min(1, "Document title is required")
    .max(100, "Title cannot exceed 100 characters")
    .trim(),
  category: z.enum([
    "requirement",
    "contract",
    "specification",
    "architecture",
    "meeting-report",
    "research",
    "other",
  ]),
  projectId: z.string().nullable().optional().default(null),
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().positive("File size must be positive"),
  extension: z.string().optional().nullable().default(null),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Document title is required")
    .max(100, "Title cannot exceed 100 characters")
    .trim()
    .optional(),
  category: z
    .enum([
      "requirement",
      "contract",
      "specification",
      "architecture",
      "meeting-report",
      "research",
      "other",
    ])
    .optional(),
  projectId: z.string().nullable().optional(),
  extension: z.string().optional().nullable(),
});

export type PresignDocumentInput = z.infer<typeof presignDocumentSchema>;
export type ConfirmDocumentInput = z.infer<typeof confirmDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
