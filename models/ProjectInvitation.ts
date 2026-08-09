import mongoose, { Schema, Document } from "mongoose";

export interface IProjectInvitation {
  projectId: mongoose.Types.ObjectId;
  email: string;
  inviterId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectInvitationDocument
  extends Document,
    Omit<IProjectInvitation, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

const ProjectInvitationSchema: Schema = new Schema<IProjectInvitationDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    inviterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Inviter ID is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "declined"],
        message: "Status must be pending, accepted, or declined",
      },
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ProjectInvitation =
  mongoose.models.ProjectInvitation ||
  mongoose.model<IProjectInvitationDocument>("ProjectInvitation", ProjectInvitationSchema);
