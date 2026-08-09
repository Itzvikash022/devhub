import mongoose, { Schema, Document } from "mongoose";

export interface IProjectField {
  key: string;
  value: string;
  type: "text" | "list" | "link" | "tag[]";
}

export interface IProjectSection {
  heading: string;
  fields: IProjectField[];
}

export interface IProjectDetail {
  projectId: mongoose.Types.ObjectId;
  sections: IProjectSection[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectDetailDocument
  extends Document, Omit<IProjectDetail, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const FieldSchema = new Schema<IProjectField>({
  key: {
    type: String,
    required: [true, "Field key is required"],
    trim: true,
  },
  value: {
    type: String,
    default: "",
    trim: true,
  },
  type: {
    type: String,
    enum: {
      values: ["text", "list", "link", "tag[]"],
      message: "Type must be text, list, link, or tag[]",
    },
    default: "text",
    required: true,
  },
});

const SectionSchema = new Schema<IProjectSection>({
  heading: {
    type: String,
    required: [true, "Section heading is required"],
    trim: true,
  },
  fields: {
    type: [FieldSchema],
    default: [],
  },
});

const ProjectDetailSchema = new Schema<IProjectDetailDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      unique: true,
      index: true,
    },
    sections: {
      type: [SectionSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose from compiling model multiple times in serverless/hot-reloads
export const ProjectDetail =
  mongoose.models.ProjectDetail ||
  mongoose.model<IProjectDetailDocument>("ProjectDetail", ProjectDetailSchema);
