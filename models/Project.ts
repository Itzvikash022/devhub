import mongoose, { Schema, Document } from "mongoose";

export interface IProject {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  status: "active" | "on-hold" | "archived";
  bugCounter: number;
  sharedWith: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectDocument extends Document, Omit<IProject, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema<IProjectDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["active", "on-hold", "archived"],
        message: "Status must be active, on-hold, or archived",
      },
      default: "active",
      required: true,
      index: true,
    },
    bugCounter: {
      type: Number,
      default: 0,
      required: true,
    },
    sharedWith: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose from compiling model multiple times in serverless/hot-reloads
export const Project =
  mongoose.models.Project || mongoose.model<IProjectDocument>("Project", ProjectSchema);
