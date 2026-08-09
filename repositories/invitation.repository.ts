import { connectToDatabase } from "@/lib/db";
import { ProjectInvitation, IProjectInvitationDocument } from "@/models/ProjectInvitation";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";
import { User } from "@/models/User";

export class InvitationRepository {
  /**
   * Creates a new invitation for a project.
   */
  static async create(data: {
    projectId: string;
    inviterId: string;
    inviteeEmail: string;
    role: "editor" | "viewer";
    status?: "pending" | "accepted" | "declined";
  }): Promise<IProjectInvitationDocument> {
    await connectToDatabase();
    const inv = new ProjectInvitation({
      projectId: new mongoose.Types.ObjectId(data.projectId),
      inviterId: new mongoose.Types.ObjectId(data.inviterId),
      email: data.inviteeEmail.toLowerCase(),
      role: data.role,
      status: data.status || "pending",
    });
    return inv.save();
  }

  /**
   * Finds an invitation by ID.
   */
  static async findById(id: string): Promise<IProjectInvitationDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    User; // Ensure model is loaded
    return ProjectInvitation.findById(id)
      .populate("projectId", "name description")
      .populate("inviterId", "name email")
      .exec();
  }

  /**
   * Finds pending invitations for a specific email.
   */
  static async findPendingByEmail(email: string): Promise<IProjectInvitationDocument[]> {
    await connectToDatabase();
    User; // Ensure model is loaded
    return ProjectInvitation.find({
      email: email.toLowerCase(),
      status: "pending",
    })
      .populate("projectId", "name description")
      .populate("inviterId", "name email")
      .exec();
  }

  /**
   * Finds all invitations for a specific project.
   */
  static async findByProjectId(projectId: string): Promise<IProjectInvitationDocument[]> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return [];

    await connectToDatabase();
    User; // Ensure model is loaded
    return ProjectInvitation.find({
      projectId: new mongoose.Types.ObjectId(projectId),
    })
      .populate("inviterId", "name email")
      .exec();
  }

  /**
   * Updates an invitation's status.
   */
  static async updateStatus(
    id: string,
    status: "accepted" | "declined"
  ): Promise<IProjectInvitationDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return ProjectInvitation.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Deletes an invitation.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await ProjectInvitation.findByIdAndDelete(id).exec();
    return !!result;
  }
}
