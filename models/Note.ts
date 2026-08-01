import mongoose, { Schema, Document } from "mongoose";

export interface INote {
  projectId: mongoose.Types.ObjectId;
  title: string;
  content: string; // JSON string of BlockNote structure
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface INoteDocument extends Document, Omit<INote, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema<INoteDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
      default: "Untitled",
    },
    content: {
      type: String,
      default: "[]",
    },
    order: {
      type: Number,
      required: [true, "Order is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose from compiling model multiple times in serverless/hot-reloads
export const Note = mongoose.models.Note || mongoose.model<INoteDocument>("Note", NoteSchema);
