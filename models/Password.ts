import mongoose, { Schema, Document } from "mongoose";

export interface IPassword {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId | null;
  label: string;
  username: string;
  encryptedSecret: string;
  iv: string;
  url: string | null;
  category:
    | "repository"
    | "hosting"
    | "database"
    | "api"
    | "cloud"
    | "personal"
    | "shared"
    | "utility"
    | "other";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasswordDocument extends Document, Omit<IPassword, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const PasswordSchema: Schema = new Schema<IPasswordDocument>(
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
    label: {
      type: String,
      required: [true, "Label is required"],
      trim: true,
      maxlength: [100, "Label cannot exceed 100 characters"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      maxlength: [100, "Username cannot exceed 100 characters"],
    },
    encryptedSecret: {
      type: String,
      required: [true, "Secret is required"],
    },
    iv: {
      type: String,
      required: [true, "IV is required"],
    },
    url: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "URL cannot exceed 500 characters"],
    },
    category: {
      type: String,
      enum: {
        values: [
          "repository",
          "hosting",
          "database",
          "api",
          "cloud",
          "personal",
          "shared",
          "utility",
          "other",
        ],
        message: "Invalid password category",
      },
      required: [true, "Category is required"],
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

export const Password =
  mongoose.models.Password || mongoose.model<IPasswordDocument>("Password", PasswordSchema);
