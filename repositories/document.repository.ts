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
    extension?: string | null;
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

  /**
   * Finds documents with filters, search, sort, and pagination.
   */
  static async findByFilters(
    userId: string,
    projectId: string | null | undefined,
    filters: {
      search?: string;
      category?: string;
      extension?: string;
      uploadDate?: string;
    },
    pagination: {
      page: number;
      pageSize: number;
      sortBy?: string;
    }
  ): Promise<{ items: IDocumentDocument[]; totalCount: number }> {
    await connectToDatabase();

    const query: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (projectId) {
      query.projectId = new mongoose.Types.ObjectId(projectId);
    } else if (projectId === null) {
      query.projectId = null;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.extension) {
      query.extension = filters.extension.toLowerCase();
    }

    if (filters.uploadDate) {
      const now = new Date();
      if (filters.uploadDate === "24h") {
        query.uploadedAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      } else if (filters.uploadDate === "7d") {
        query.uploadedAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (filters.uploadDate === "30d") {
        query.uploadedAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [
        { title: searchRegex },
        { fileName: searchRegex },
        { category: searchRegex },
        { extension: searchRegex },
      ];
    }

    let sortOption: Record<string, any> = { createdAt: -1 };
    if (pagination.sortBy === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (pagination.sortBy === "alphabetical") {
      sortOption = { title: 1 };
    } else if (pagination.sortBy === "largest") {
      sortOption = { fileSize: -1 };
    } else if (pagination.sortBy === "smallest") {
      sortOption = { fileSize: 1 };
    }

    const skip = (pagination.page - 1) * pagination.pageSize;

    const [items, totalCount] = await Promise.all([
      DocumentModel.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(pagination.pageSize)
        .exec(),
      DocumentModel.countDocuments(query),
    ]);

    return { items, totalCount };
  }
}
