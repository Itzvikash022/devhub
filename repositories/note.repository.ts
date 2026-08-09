import { connectToDatabase } from "@/lib/db";
import { Note, INoteDocument } from "@/models/Note";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";
import { User } from "@/models/User";

export class NoteRepository {
  /**
   * Finds a note by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<INoteDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    User; // Ensure model is loaded
    return Note.findById(id).populate("createdBy", "name email").exec();
  }

  /**
   * Finds all notes belonging to a project, sorted by order index.
   */
  static async findAllByProjectId(projectId: string): Promise<INoteDocument[]> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return [];

    await connectToDatabase();
    User; // Ensure model is loaded
    return Note.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .populate("createdBy", "name email")
      .sort({ order: 1 })
      .exec();
  }

  /**
   * Creates a new note page.
   */
  static async create(noteData: {
    projectId: string;
    title: string;
    content: string;
    order: number;
    createdBy: string;
  }): Promise<INoteDocument> {
    await connectToDatabase();
    const note = new Note({
      ...noteData,
      projectId: new mongoose.Types.ObjectId(noteData.projectId),
      createdBy: new mongoose.Types.ObjectId(noteData.createdBy),
    });
    return note.save();
  }

  /**
   * Updates note fields.
   */
  static async update(
    id: string,
    noteData: Partial<{
      title: string;
      content: string;
      order: number;
    }>
  ): Promise<INoteDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return Note.findByIdAndUpdate(id, noteData, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Deletes a note page by id.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await Note.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Performs bulk updates to persist note ordering indexes.
   */
  static async updateOrders(orders: Array<{ id: string; order: number }>): Promise<void> {
    await connectToDatabase();
    const bulkOps = orders.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { order: item.order },
      },
    }));

    await Note.bulkWrite(bulkOps);
  }
}
