import { connectToDatabase } from "@/lib/db";
import { ProjectDetail, IProjectDetailDocument, IProjectSection } from "@/models/ProjectDetail";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class ProjectDetailRepository {
  /**
   * Finds project details by projectId.
   */
  static async findByProjectId(projectId: string): Promise<IProjectDetailDocument | null> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return ProjectDetail.findOne({ projectId: new mongoose.Types.ObjectId(projectId) }).exec();
  }

  /**
   * Creates a new empty project details record.
   */
  static async create(
    projectId: string,
    sections: IProjectSection[] = []
  ): Promise<IProjectDetailDocument> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) {
      throw new Error("Invalid Project ID");
    }

    await connectToDatabase();
    const details = new ProjectDetail({
      projectId: new mongoose.Types.ObjectId(projectId),
      sections,
    });
    return details.save();
  }

  /**
   * Updates project details, creating them if they do not exist (upsert).
   */
  static async update(
    projectId: string,
    sections: IProjectSection[]
  ): Promise<IProjectDetailDocument | null> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return ProjectDetail.findOneAndUpdate(
      { projectId: new mongoose.Types.ObjectId(projectId) },
      { sections },
      { new: true, upsert: true, runValidators: true }
    ).exec();
  }

  /**
   * Deletes project details by projectId.
   */
  static async deleteByProjectId(projectId: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await ProjectDetail.deleteOne({
      projectId: new mongoose.Types.ObjectId(projectId),
    }).exec();
    return result.deletedCount > 0;
  }
}
