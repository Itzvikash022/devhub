import { connectToDatabase } from "@/lib/db";
import { ImageAsset, IImageAssetDocument } from "@/models/ImageAsset";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";
import { User } from "@/models/User";

export class ImageAssetRepository {
  /**
   * Finds an image asset by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<IImageAssetDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    User; // Ensure model is loaded
    return ImageAsset.findById(id).populate("uploadedBy", "name email").exec();
  }

  /**
   * Finds all image assets belonging to a project workspace.
   */
  static async findAllByProjectId(projectId: string): Promise<IImageAssetDocument[]> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return [];

    await connectToDatabase();
    User; // Ensure model is loaded
    return ImageAsset.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Finds all image assets across a list of project IDs.
   */
  static async findAllByProjectIds(projectIds: string[]): Promise<IImageAssetDocument[]> {
    if (projectIds.length === 0) return [];
    await connectToDatabase();
    const objectIds = projectIds
      .map((id) => objectIdSchema.safeParse(id))
      .filter((r) => r.success)
      .map((r) => new mongoose.Types.ObjectId(r.data));

    User; // Ensure model is loaded
    return ImageAsset.find({ projectId: { $in: objectIds } })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Creates a new image asset record.
   */
  static async create(imageData: {
    projectId: string;
    name: string;
    r2Key: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    category: string;
    description: string;
    expiryDate: Date | null;
    isEncrypted: boolean;
    width?: number | null;
    height?: number | null;
    thumbnail?: string | null;
    originalKey?: string | null;
    thumbnailKey?: string | null;
    uploadedBy: string;
  }): Promise<IImageAssetDocument> {
    await connectToDatabase();
    const asset = new ImageAsset({
      ...imageData,
      projectId: new mongoose.Types.ObjectId(imageData.projectId),
      uploadedBy: new mongoose.Types.ObjectId(imageData.uploadedBy),
    });
    return asset.save();
  }

  /**
   * Finds image assets using pagination, sorting, search, and category filtering.
   */
  static async findByFilters(
    filter: { projectId?: string; projectIds?: string[]; search?: string; category?: string },
    options: { page?: number; pageSize?: number; sortBy?: string }
  ): Promise<{ items: IImageAssetDocument[]; totalCount: number }> {
    await connectToDatabase();

    const query: any = {};

    if (filter.projectId) {
      const parseResult = objectIdSchema.safeParse(filter.projectId);
      if (parseResult.success) {
        query.projectId = new mongoose.Types.ObjectId(filter.projectId);
      }
    } else if (filter.projectIds && filter.projectIds.length > 0) {
      const objectIds = filter.projectIds
        .map((id) => objectIdSchema.safeParse(id))
        .filter((r) => r.success)
        .map((r) => new mongoose.Types.ObjectId(r.data));
      query.projectId = { $in: objectIds };
    }

    if (filter.search) {
      query.name = { $regex: filter.search, $options: "i" };
    }

    if (filter.category) {
      query.category = filter.category;
    }

    // Sort options mapping
    let sortOptions: any = { createdAt: -1 };
    if (options.sortBy) {
      switch (options.sortBy) {
        case "oldest":
          sortOptions = { createdAt: 1 };
          break;
        case "largest":
          sortOptions = { fileSize: -1 };
          break;
        case "smallest":
          sortOptions = { fileSize: 1 };
          break;
        case "name":
          sortOptions = { name: 1 };
          break;
        case "newest":
        default:
          sortOptions = { createdAt: -1 };
          break;
      }
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 30;
    const skip = (page - 1) * pageSize;

    const [items, totalCount] = await Promise.all([
      ImageAsset.find(query)
        .populate("uploadedBy", "name email")
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      ImageAsset.countDocuments(query).exec(),
    ]);

    return { items, totalCount };
  }

  /**
   * Updates an image asset record.
   */
  static async update(id: string, data: any): Promise<IImageAssetDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return ImageAsset.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  /**
   * Deletes an image asset by ID.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await ImageAsset.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Deletes all image assets associated with a project workspace.
   */
  static async deleteByProjectId(projectId: string): Promise<void> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return;

    await connectToDatabase();
    await ImageAsset.deleteMany({
      projectId: new mongoose.Types.ObjectId(projectId),
    }).exec();
  }
}
