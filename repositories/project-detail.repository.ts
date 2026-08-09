import { connectToDatabase } from "@/lib/db";
import { ProjectDetail, IProjectDetailDocument, IProjectSection } from "@/models/ProjectDetail";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";
import { User } from "@/models/User";

export class ProjectDetailRepository {
  /**
   * Finds project details by projectId.
   */
  static async findByProjectId(projectId: string): Promise<IProjectDetailDocument | null> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return null;

    await connectToDatabase();
    User; // Ensure model is loaded
    return ProjectDetail.findOne({ projectId: new mongoose.Types.ObjectId(projectId) }).populate("createdBy", "name email").exec();
  }

  /**
   * Creates a new empty project details record.
   */
  static async create(
    projectId: string,
    createdBy: string,
    sections: IProjectSection[] = []
  ): Promise<IProjectDetailDocument> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) {
      throw new Error("Invalid Project ID");
    }

    await connectToDatabase();
    const details = new ProjectDetail({
      projectId: new mongoose.Types.ObjectId(projectId),
      createdBy: new mongoose.Types.ObjectId(createdBy),
      sections,
    });
    return details.save();
  }

  /**
   * Updates project details, creating them if they do not exist (upsert).
   */
  static async update(
    projectId: string,
    sections: IProjectSection[],
    createdBy: string
  ): Promise<IProjectDetailDocument | null> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return ProjectDetail.findOneAndUpdate(
      { projectId: new mongoose.Types.ObjectId(projectId) },
      { sections, $setOnInsert: { createdBy: new mongoose.Types.ObjectId(createdBy) } },
      { new: true, upsert: true, runValidators: true }
    ).populate("createdBy", "name email").exec();
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
