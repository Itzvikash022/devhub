import { connectToDatabase } from "@/lib/db";
import { Password, IPasswordDocument } from "@/models/Password";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class PasswordRepository {
  /**
   * Finds a password record by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<IPasswordDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return Password.findById(id).populate("userId", "name email").exec();
  }

  /**
   * Finds all passwords belonging to a user. Optionally filters by projectId.
   */
  static async findAllByUserId(userId: string, projectId?: string): Promise<IPasswordDocument[]> {
    const parseUser = objectIdSchema.safeParse(userId);
    if (!parseUser.success) return [];

    let query: any = {};
    if (projectId) {
      const parseProject = objectIdSchema.safeParse(projectId);
      if (parseProject.success) {
        query.projectId = new mongoose.Types.ObjectId(projectId);
        query.$or = [{ userId: new mongoose.Types.ObjectId(userId) }, { isShared: true }];
      }
    } else {
      query.$or = [
        { userId: new mongoose.Types.ObjectId(userId) },
        { isShared: true, projectId: { $ne: null } }
      ];
    }

    await connectToDatabase();
    return Password.find(query).populate("userId", "name email").sort({ createdAt: -1 }).exec();
  }

  /**
   * Creates a new password record.
   */
  static async create(passwordData: {
    userId: string;
    projectId: string | null;
    label: string;
    username: string;
    encryptedSecret: string;
    iv: string;
    url: string | null;
    category: string;
    notes: string;
    isShared: boolean;
  }): Promise<IPasswordDocument> {
    await connectToDatabase();
    const password = new Password({
      ...passwordData,
      userId: new mongoose.Types.ObjectId(passwordData.userId),
      projectId: passwordData.projectId
        ? new mongoose.Types.ObjectId(passwordData.projectId)
        : null,
    });
    return password.save();
  }

  /**
   * Updates an existing password record.
   */
  static async update(
    id: string,
    passwordData: Partial<{
      projectId: string | null;
      label: string;
      username: string;
      encryptedSecret: string;
      iv: string;
      url: string | null;
      category: string;
      notes: string;
      isShared: boolean;
    }>
  ): Promise<IPasswordDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    const payload = { ...passwordData } as Record<string, unknown>;
    if (payload.projectId !== undefined) {
      payload.projectId = payload.projectId
        ? new mongoose.Types.ObjectId(payload.projectId as string)
        : null;
    }

    await connectToDatabase();
    return Password.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Deletes a password record by ID.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await Password.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Unlinks all passwords associated with a specific project by setting projectId to null.
   */
  static async unlinkAllByProjectId(projectId: string): Promise<void> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return;

    await connectToDatabase();
    await Password.updateMany(
      { projectId: new mongoose.Types.ObjectId(projectId) },
      { $set: { projectId: null } }
    ).exec();
  }
}
