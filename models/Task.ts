import mongoose, { Schema, Document } from "mongoose";

export interface IComment {
  text: string;
  createdAt: Date;
}

export interface ITask {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  priority: "low" | "medium" | "high";
  dueDate: Date | null;
  comments: IComment[];
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
        values: ["todo", "in-progress", "blocked", "done"],
        message: "Status must be todo, in-progress, blocked, or done",
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
  },
  {
    timestamps: true,
  }
);

export const Task = mongoose.models.Task || mongoose.model<ITaskDocument>("Task", TaskSchema);
