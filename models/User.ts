import mongoose, { Schema, Document } from "mongoose";

export interface IUser {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document, Omit<IUser, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose from compiling model multiple times in serverless/hot-reloads
export const User = mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
