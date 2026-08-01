import mongoose, { Schema, Document } from "mongoose";

export interface IPipelineItem {
  projectId: mongoose.Types.ObjectId;
  category:
    | "repository"
    | "hosting"
    | "domain"
    | "database"
    | "storage"
    | "monitoring"
    | "analytics"
    | "ci-cd"
    | "api"
    | "docs"
    | "other";
  label: string;
  url: string;
  environment: "production" | "development" | "staging" | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPipelineItemDocument
  extends Document, Omit<IPipelineItem, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const PipelineItemSchema: Schema = new Schema<IPipelineItemDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: [
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
        ],
        message: "Invalid pipeline category",
      },
      required: [true, "Category is required"],
      index: true,
    },
    label: {
      type: String,
      required: [true, "Label is required"],
      trim: true,
      maxlength: [100, "Label cannot exceed 100 characters"],
    },
    url: {
      type: String,
      required: [true, "URL is required"],
      trim: true,
      maxlength: [500, "URL cannot exceed 500 characters"],
    },
    environment: {
      type: String,
      enum: {
        values: ["production", "development", "staging", null],
        message: "Environment must be production, development, staging, or null",
      },
      default: null,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

export const PipelineItem =
  mongoose.models.PipelineItem ||
  mongoose.model<IPipelineItemDocument>("PipelineItem", PipelineItemSchema);
