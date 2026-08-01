import { z } from "zod";

export const presignImageAssetSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
});

export const confirmImageAssetSchema = z.object({
  r2Key: z.string().min(1, "R2 key is required"),
  name: z
    .string()
    .min(1, "Image name is required")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  category: z.enum(["mockup", "screenshot", "architecture", "asset", "other"]),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .default(""),
  expiryDate: z
    .preprocess((val) => (val ? new Date(val as string) : null), z.date().nullable())
    .optional()
    .default(null),
  passphrase: z
    .string()
    .min(4, "Passphrase must be at least 4 characters")
    .max(50, "Passphrase cannot exceed 50 characters")
    .nullable()
    .optional()
    .default(null),
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().positive("File size must be positive"),
});

export const decryptImageAssetSchema = z.object({
  passphrase: z.string().min(1, "Passphrase is required"),
});

export type PresignImageAssetInput = z.infer<typeof presignImageAssetSchema>;
export type ConfirmImageAssetInput = z.infer<typeof confirmImageAssetSchema>;
export type DecryptImageAssetInput = z.infer<typeof decryptImageAssetSchema>;
