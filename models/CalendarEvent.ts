import mongoose, { Schema, Document } from "mongoose";

export interface ICalendarEvent {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId | null;
  title: string;
  date: Date;
  type: "personal" | "milestone" | "deadline" | "meeting" | "release";
  source: "manual" | "task" | "milestone";
  sourceId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICalendarEventDocument
  extends Document, Omit<ICalendarEvent, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema: Schema = new Schema<ICalendarEventDocument>(
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
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ["personal", "milestone", "deadline", "meeting", "release"],
        message: "Type must be personal, milestone, deadline, meeting, or release",
      },
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: {
        values: ["manual", "task", "milestone"],
        message: "Source must be manual, task, or milestone",
      },
      default: "manual",
      required: true,
      index: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CalendarEvent =
  mongoose.models.CalendarEvent ||
  mongoose.model<ICalendarEventDocument>("CalendarEvent", CalendarEventSchema);
