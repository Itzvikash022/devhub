import { connectToDatabase } from "@/lib/db";
import { Task, ITaskDocument } from "@/models/Task";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class TaskRepository {
  /**
   * Finds a task by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<ITaskDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return Task.findById(id).exec();
  }

  /**
   * Finds all tasks belonging to a project.
   */
  static async findAllByProjectId(projectId: string): Promise<ITaskDocument[]> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return [];

    await connectToDatabase();
    return Task.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Creates a new task.
   */
  static async create(taskData: {
    projectId: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    assignee: string | null;
  }): Promise<ITaskDocument> {
    await connectToDatabase();
    const task = new Task({
      ...taskData,
      projectId: new mongoose.Types.ObjectId(taskData.projectId),
    });
    return task.save();
  }

  /**
   * Updates an existing task.
   */
  static async update(
    id: string,
    taskData: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      dueDate: Date | null;
      assignee: string | null;
    }>
  ): Promise<ITaskDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return Task.findByIdAndUpdate(id, taskData, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Deletes a task by ID.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await Task.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Deletes all tasks associated with a project.
   */
  static async deleteByProjectId(projectId: string): Promise<void> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return;

    await connectToDatabase();
    await Task.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) }).exec();
  }

  /**
   * Appends a comment to a task's comments list.
   */
  static async addComment(id: string, commentText: string): Promise<ITaskDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return Task.findByIdAndUpdate(
      id,
      {
        $push: { comments: { text: commentText, createdAt: new Date() } },
      },
      { new: true }
    ).exec();
  }
}
