import mongoose, { Schema, Document } from "mongoose";

export interface IComment {
  text: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ITask {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "blocked" | "ready-for-test" | "done";
  priority: "low" | "medium" | "high";
  dueDate: Date | null;
  comments: IComment[];
  type: "task" | "bug";
  bugNumber?: number | null;
  area?: string | null;
  screenshots: string[];
  assignedTo?: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends Document, Omit<ITask, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    text: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TaskSchema: Schema = new Schema<ITaskDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
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
        values: ["todo", "in-progress", "blocked", "ready-for-test", "done"],
        message: "Status must be todo, in-progress, blocked, ready-for-test, or done",
      },
      default: "todo",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "Priority must be low, medium, or high",
      },
      default: "medium",
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    comments: {
      type: [CommentSchema],
      default: [],
    },
    type: {
      type: String,
      enum: {
        values: ["task", "bug"],
        message: "Type must be task or bug",
      },
      default: "task",
      required: true,
      index: true,
    },
    bugNumber: {
      type: Number,
      default: null,
      index: true,
    },
    area: {
      type: String,
      default: null,
      index: true,
    },
    screenshots: {
      type: [String],
      default: [],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Task = mongoose.models.Task || mongoose.model<ITaskDocument>("Task", TaskSchema);
