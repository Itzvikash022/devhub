import { connectToDatabase } from "@/lib/db";
import { CalendarEvent, ICalendarEventDocument } from "@/models/CalendarEvent";
import { objectIdSchema } from "@/schemas/common.schema";
import mongoose from "mongoose";

export class CalendarEventRepository {
  /**
   * Finds a calendar event by its MongoDB ObjectId.
   */
  static async findById(id: string): Promise<ICalendarEventDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return CalendarEvent.findById(id).populate("userId", "name email").exec();
  }

  /**
   * Finds all calendar events for a user, optionally pre-filtered by projectId.
   */
  static async findAllByUserId(
    userId: string,
    projectId?: string
  ): Promise<ICalendarEventDocument[]> {
    const parseUser = objectIdSchema.safeParse(userId);
    if (!parseUser.success) return [];

    let query: any = {};
    if (projectId) {
      const parseProject = objectIdSchema.safeParse(projectId);
      if (parseProject.success) {
        query.projectId = new mongoose.Types.ObjectId(projectId);
      }
    } else {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    await connectToDatabase();
    return CalendarEvent.find(query).populate("userId", "name email").sort({ date: 1 }).exec();
  }

  /**
   * Creates a new calendar event.
   */
  static async create(eventData: {
    userId: string;
    projectId: string | null;
    title: string;
    date: Date;
    type: string;
    source: string;
    sourceId: string | null;
  }): Promise<ICalendarEventDocument> {
    await connectToDatabase();
    const event = new CalendarEvent({
      ...eventData,
      userId: new mongoose.Types.ObjectId(eventData.userId),
      projectId: eventData.projectId ? new mongoose.Types.ObjectId(eventData.projectId) : null,
      sourceId: eventData.sourceId ? new mongoose.Types.ObjectId(eventData.sourceId) : null,
    });
    return event.save();
  }

  /**
   * Updates an existing calendar event.
   */
  static async update(
    id: string,
    eventData: Partial<{
      title: string;
      date: Date;
      type: string;
      projectId: string | null;
    }>
  ): Promise<ICalendarEventDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    const payload = { ...eventData } as Record<string, unknown>;
    if (payload.projectId !== undefined) {
      payload.projectId = payload.projectId
        ? new mongoose.Types.ObjectId(payload.projectId as string)
        : null;
    }

    await connectToDatabase();
    return CalendarEvent.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Deletes a calendar event record by ID.
   */
  static async delete(id: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await CalendarEvent.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Creates or updates a calendar event generated from a task deadline (upsert).
   */
  static async upsertTaskEvent(
    userId: string,
    projectId: string,
    taskId: string,
    title: string,
    date: Date
  ): Promise<ICalendarEventDocument | null> {
    const parseUser = objectIdSchema.safeParse(userId);
    const parseProject = objectIdSchema.safeParse(projectId);
    const parseTask = objectIdSchema.safeParse(taskId);

    if (!parseUser.success || !parseProject.success || !parseTask.success) {
      return null;
    }

    await connectToDatabase();

    return CalendarEvent.findOneAndUpdate(
      {
        source: "task",
        sourceId: new mongoose.Types.ObjectId(taskId),
      },
      {
        userId: new mongoose.Types.ObjectId(userId),
        projectId: new mongoose.Types.ObjectId(projectId),
        title,
        date,
        type: "deadline",
        source: "task",
        sourceId: new mongoose.Types.ObjectId(taskId),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).exec();
  }

  /**
   * Deletes calendar events matching a specific source ID.
   */
  static async deleteBySourceId(sourceId: string): Promise<boolean> {
    const parseResult = objectIdSchema.safeParse(sourceId);
    if (!parseResult.success) return false;

    await connectToDatabase();
    const result = await CalendarEvent.deleteMany({
      sourceId: new mongoose.Types.ObjectId(sourceId),
    }).exec();
    return (result.deletedCount || 0) > 0;
  }

  /**
   * Deletes all calendar events linked to a project workspace.
   */
  static async deleteByProjectId(projectId: string): Promise<void> {
    const parseResult = objectIdSchema.safeParse(projectId);
    if (!parseResult.success) return;

    await connectToDatabase();
    await CalendarEvent.deleteMany({
      projectId: new mongoose.Types.ObjectId(projectId),
    }).exec();
  }
}
