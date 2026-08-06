import mongoose, { Schema, Document } from "mongoose";

export interface IDocument {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId | null;
  title: string;
  r2Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extension?: string | null;
  category:
    | "requirement"
    | "contract"
    | "specification"
    | "architecture"
    | "meeting-report"
    | "research"
    | "other";
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentDocument extends Document, Omit<IDocument, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema<IDocumentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    r2Key: {
      type: String,
      required: [true, "R2 key is required"],
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
    },
    category: {
      type: String,
      enum: {
        values: [
          "requirement",
          "contract",
          "specification",
          "architecture",
          "meeting-report",
          "research",
          "other",
        ],
        message: "Invalid document category",
      },
      required: [true, "Category is required"],
      index: true,
    },
    extension: {
      type: String,
      default: null,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const DocumentModel =
  mongoose.models.Document || mongoose.model<IDocumentDocument>("Document", DocumentSchema);
