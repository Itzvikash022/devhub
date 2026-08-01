import { connectToDatabase } from "@/lib/db";
import { ImageAsset, IImageAssetDocument } from "@/models/ImageAsset";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class ImageAssetRepository {
  /**
   * Finds an image asset by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<IImageAssetDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return ImageAsset.findById(id).exec();
  }

  /**
   * Finds all image assets belonging to a project workspace.
   */
  static async findAllByProjectId(projectId: string): Promise<IImageAssetDocument[]> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return [];

    await connectToDatabase();
    return ImageAsset.find({ projectId: new mongoose.Types.ObjectId(projectId) })
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
  }): Promise<IImageAssetDocument> {
    await connectToDatabase();
    const asset = new ImageAsset({
      ...imageData,
      projectId: new mongoose.Types.ObjectId(imageData.projectId),
    });
    return asset.save();
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
