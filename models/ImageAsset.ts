import mongoose, { Schema, Document } from "mongoose";

export interface IImageAsset {
  projectId: mongoose.Types.ObjectId;
  name: string;
  r2Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: "mockup" | "screenshot" | "architecture" | "asset" | "other";
  description: string;
  expiryDate: Date | null;
  isEncrypted: boolean;
  width?: number | null;
  height?: number | null;
  thumbnail?: string | null;
  originalKey?: string | null;
  thumbnailKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IImageAssetDocument
  extends Document, Omit<IImageAsset, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const ImageAssetSchema: Schema = new Schema<IImageAssetDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Image name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
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
        values: ["mockup", "screenshot", "architecture", "asset", "other"],
        message: "Category must be mockup, screenshot, architecture, asset, or other",
      },
      required: [true, "Category is required"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    originalKey: {
      type: String,
      default: null,
    },
    thumbnailKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ImageAsset =
  mongoose.models.ImageAsset || mongoose.model<IImageAssetDocument>("ImageAsset", ImageAssetSchema);
