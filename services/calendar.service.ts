import { CalendarEventRepository } from "@/repositories/calendar-event.repository";
import { ProjectService } from "@/services/project.service";
import {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/schemas/calendar-event.schema";
import { ICalendarEventDocument } from "@/models/CalendarEvent";

export class CalendarService {
  /**
   * Helper to verify that a calendar event belongs to the authenticated user.
   */
  private static async verifyEventOwnership(
    userId: string,
    id: string
  ): Promise<ICalendarEventDocument> {
    const event = await CalendarEventRepository.findById(id);
    if (!event) {
      throw new Error("NOT_FOUND");
    }

    if (event.userId.toString() !== userId) {
      throw new Error("FORBIDDEN");
    }

    return event;
  }

  /**
   * Creates a new manual calendar event.
   */
  static async create(
    userId: string,
    data: CreateCalendarEventInput
  ): Promise<ICalendarEventDocument> {
    // If linking to a project, verify project ownership
    if (data.projectId) {
      await ProjectService.getById(userId, data.projectId);
    }

    return CalendarEventRepository.create({
      userId,
      projectId: data.projectId || null,
      title: data.title,
      date: data.date,
      type: data.type,
      source: "manual",
      sourceId: null,
    });
  }

  /**
   * Lists calendar events for the user. Optionally filters by projectId.
   */
  static async list(userId: string, projectId?: string): Promise<ICalendarEventDocument[]> {
    if (projectId) {
      await ProjectService.getById(userId, projectId);
    }

    return CalendarEventRepository.findAllByUserId(userId, projectId);
  }

  /**
   * Updates a manual calendar event.
   */
  static async update(
    userId: string,
    id: string,
    data: UpdateCalendarEventInput
  ): Promise<ICalendarEventDocument> {
    const event = await this.verifyEventOwnership(userId, id);

    // Enforce read-only constraint for auto-generated task deadlines
    if (event.source !== "manual") {
      throw new Error("CANNOT_MODIFY_AUTO_EVENT");
    }

    // If linking to a project, verify project ownership
    if (data.projectId) {
      await ProjectService.getById(userId, data.projectId);
    }

    const updated = await CalendarEventRepository.update(id, data);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  }

  /**
   * Deletes a manual calendar event.
   */
  static async delete(userId: string, id: string): Promise<void> {
    const event = await this.verifyEventOwnership(userId, id);

    // Enforce read-only constraint for auto-generated task deadlines
    if (event.source !== "manual") {
      throw new Error("CANNOT_MODIFY_AUTO_EVENT");
    }

    const deleted = await CalendarEventRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }
  }
}
