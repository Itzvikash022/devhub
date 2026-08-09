import { connectToDatabase } from "@/lib/db";
import { Project, IProjectDocument } from "@/models/Project";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class ProjectRepository {
  /**
   * Finds a project by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<IProjectDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return Project.findById(id)
      .populate("userId", "name email")
      .populate("sharedWith", "name email")
      .exec();
  }

  /**
   * Finds all projects belonging to a user, with optional status filter.
   */
  static async findAllByUserId(
    userId: string,
    filter?: { status?: string }
  ): Promise<IProjectDocument[]> {
    const parseResult = objectIdSchema.safeParse(userId);
    if (!parseResult.success) return [];

    await connectToDatabase();

    const userObjId = new mongoose.Types.ObjectId(userId);
    const query: any = {
      $or: [{ userId: userObjId }, { sharedWith: userObjId }],
    };
    if (filter?.status) {
      query.status = filter.status;
    }

    // Sort active first, then on-hold, then archived. Within statuses, sort by name.
    return Project.find(query)
      .populate("userId", "name email")
      .populate("sharedWith", "name email")
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * Creates a new project record.
   */
  static async create(projectData: {
    userId: string;
    name: string;
    description: string;
    status: string;
  }): Promise<IProjectDocument> {
    await connectToDatabase();
    const project = new Project({
      ...projectData,
      userId: new mongoose.Types.ObjectId(projectData.userId),
    });
    return project.save();
  }

  /**
   * Updates an existing project.
   */
  static async update(
    id: string,
    projectData: Partial<{
      name: string;
      description: string;
      status: string;
    }>
  ): Promise<IProjectDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return Project.findByIdAndUpdate(id, projectData, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Deletes a project by id.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await Project.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Updates the project's updatedAt timestamp to current time.
   */
  static async touch(id: string): Promise<void> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return;

    await connectToDatabase();
    await Project.findByIdAndUpdate(id, { updatedAt: new Date() }).exec();
  }

  /**
   * Atomically increments and returns the bug counter of a project.
   */
  static async incrementBugCounter(id: string): Promise<number> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) {
      throw new Error("INVALID_ID");
    }

    await connectToDatabase();
    const updated = await Project.findByIdAndUpdate(
      id,
      { $inc: { bugCounter: 1 } },
      { new: true }
    ).exec();

    if (!updated) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    return updated.bugCounter;
  }

  /**
   * Adds a user to the sharedWith array of a project.
   */
  static async addSharedUser(projectId: string, userId: string): Promise<IProjectDocument | null> {
    const parseProject = objectIdSchema.safeParse(projectId);
    const parseUser = objectIdSchema.safeParse(userId);
    if (!parseProject.success || !parseUser.success) return null;

    await connectToDatabase();
    return Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { sharedWith: new mongoose.Types.ObjectId(userId) } },
      { new: true }
    ).exec();
  }
}
