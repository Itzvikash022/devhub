import { connectToDatabase } from "@/lib/db";
import { DocumentModel, IDocumentDocument } from "@/models/Document";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class DocumentRepository {
  /**
   * Finds a document by MongoDB ObjectId.
   */
  static async findById(id: string): Promise<IDocumentDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return DocumentModel.findById(id).exec();
  }

  /**
   * Finds all documents associated with a user, optionally pre-filtered by projectId.
   */
  static async findAllByUserId(userId: string, projectId?: string): Promise<IDocumentDocument[]> {
    const parseUser = objectIdSchema.safeParse(userId);
    if (!parseUser.success) return [];

    const query: Record<string, mongoose.Types.ObjectId | null | undefined> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (projectId) {
      const parseProject = objectIdSchema.safeParse(projectId);
      if (parseProject.success) {
        query.projectId = new mongoose.Types.ObjectId(projectId);
      }
    }

    await connectToDatabase();
    return DocumentModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Creates a new document record.
   */
  static async create(docData: {
    userId: string;
    projectId: string | null;
    title: string;
    r2Key: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    category: string;
  }): Promise<IDocumentDocument> {
    await connectToDatabase();
    const doc = new DocumentModel({
      ...docData,
      userId: new mongoose.Types.ObjectId(docData.userId),
      projectId: docData.projectId ? new mongoose.Types.ObjectId(docData.projectId) : null,
    });
    return doc.save();
  }

  /**
   * Updates document metadata.
   */
  static async update(
    id: string,
    docData: Partial<{
      projectId: string | null;
      title: string;
      category: string;
    }>
  ): Promise<IDocumentDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    const payload = { ...docData } as Record<string, unknown>;
    if (payload.projectId !== undefined) {
      payload.projectId = payload.projectId
        ? new mongoose.Types.ObjectId(payload.projectId as string)
        : null;
    }

    await connectToDatabase();
    return DocumentModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Deletes a document record by ID.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await DocumentModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Unlinks all documents associated with a specific project by setting projectId to null.
   */
  static async unlinkAllByProjectId(projectId: string): Promise<void> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return;

    await connectToDatabase();
    await DocumentModel.updateMany(
      { projectId: new mongoose.Types.ObjectId(projectId) },
      { $set: { projectId: null } }
    ).exec();
  }
}
