import { connectToDatabase } from "@/lib/db";
import { PipelineItem, IPipelineItemDocument } from "@/models/PipelineItem";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class PipelineRepository {
  /**
   * Finds a pipeline item by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<IPipelineItemDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return PipelineItem.findById(id).populate("createdBy", "name email").exec();
  }

  /**
   * Finds all pipeline items belonging to a project workspace.
   */
  static async findAllByProjectId(projectId: string): Promise<IPipelineItemDocument[]> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return [];

    await connectToDatabase();
    return PipelineItem.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Creates a new pipeline reference item.
   */
  static async create(itemData: {
    projectId: string;
    category: string;
    label: string;
    url: string;
    environment: string | null;
    notes: string;
    createdBy: string;
  }): Promise<IPipelineItemDocument> {
    await connectToDatabase();
    const item = new PipelineItem({
      ...itemData,
      projectId: new mongoose.Types.ObjectId(itemData.projectId),
      createdBy: new mongoose.Types.ObjectId(itemData.createdBy),
    });
    return item.save();
  }

  /**
   * Updates an existing pipeline reference item.
   */
  static async update(
    id: string,
    itemData: Partial<{
      category: string;
      label: string;
      url: string;
      environment: string | null;
      notes: string;
    }>
  ): Promise<IPipelineItemDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return PipelineItem.findByIdAndUpdate(id, itemData, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Deletes a pipeline reference item by ID.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await PipelineItem.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Deletes all pipeline reference items associated with a project workspace.
   */
  static async deleteByProjectId(projectId: string): Promise<void> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return;

    await connectToDatabase();
    await PipelineItem.deleteMany({
      projectId: new mongoose.Types.ObjectId(projectId),
    }).exec();
  }
}
