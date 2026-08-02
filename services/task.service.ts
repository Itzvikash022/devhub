import { TaskRepository } from "@/repositories/task.repository";
import { CalendarEventRepository } from "@/repositories/calendar-event.repository";
import { ProjectService } from "@/services/project.service";
import { CreateTaskInput, UpdateTaskInput } from "@/schemas/task.schema";
import { ITaskDocument } from "@/models/Task";

export class TaskService {
  /**
   * Helper to verify that a task belongs to a project owned by the user.
   */
  private static async verifyTaskOwnership(userId: string, id: string): Promise<ITaskDocument> {
    const task = await TaskRepository.findById(id);
    if (!task) {
      throw new Error("NOT_FOUND");
    }

    // Verify user owns the associated project
    await ProjectService.getById(userId, task.projectId.toString());
    return task;
  }

  /**
   * Creates a new task and registers a calendar event if it has a due date.
   */
  static async create(
    userId: string,
    projectId: string,
    data: CreateTaskInput
  ): Promise<ITaskDocument> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    const task = await TaskRepository.create({
      projectId,
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      dueDate: data.dueDate || null,
      assignee: data.assignee || null,
    });

    // Calendar sync: Add deadline if task has due date and is not completed
    if (task.dueDate && task.status !== "done") {
      await CalendarEventRepository.upsertTaskEvent(
        userId,
        projectId,
        task._id.toString(),
        task.title,
        task.dueDate
      );
    }

    await ProjectService.touch(projectId);

    return task;
  }

  /**
   * Retrieves a single task, checking ownership.
   */
  static async getById(userId: string, id: string): Promise<ITaskDocument> {
    return this.verifyTaskOwnership(userId, id);
  }

  /**
   * Lists all tasks for a project, verifying project ownership.
   */
  static async listByProjectId(userId: string, projectId: string): Promise<ITaskDocument[]> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    return TaskRepository.findAllByProjectId(projectId);
  }

  /**
   * Updates task attributes, checking ownership, and syncing calendar deadlines.
   */
  static async update(userId: string, id: string, data: UpdateTaskInput): Promise<ITaskDocument> {
    const task = await this.verifyTaskOwnership(userId, id);

    const updated = await TaskRepository.update(id, data);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    // Calendar sync:
    // If task has a deadline and is not completed, create/update its calendar event.
    // Otherwise (no deadline OR marked done), clean up its calendar event.
    if (updated.dueDate && updated.status !== "done") {
      await CalendarEventRepository.upsertTaskEvent(
        userId,
        updated.projectId.toString(),
        updated._id.toString(),
        updated.title,
        updated.dueDate
      );
    } else {
      await CalendarEventRepository.deleteBySourceId(id);
    }

    await ProjectService.touch(task.projectId.toString());

    return updated;
  }

  /**
   * Deletes a task, checking ownership, and cleans up calendar deadlines.
   */
  static async delete(userId: string, id: string): Promise<void> {
    const task = await this.verifyTaskOwnership(userId, id);

    const deleted = await TaskRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    // Calendar sync: Clean up linked event
    await CalendarEventRepository.deleteBySourceId(id);

    await ProjectService.touch(task.projectId.toString());
  }

  /**
   * Appends a comment to a task, checking ownership.
   */
  static async addComment(userId: string, id: string, text: string): Promise<ITaskDocument> {
    const task = await this.verifyTaskOwnership(userId, id);

    const updated = await TaskRepository.addComment(id, text);
    if (!updated) {
      throw new Error("COMMENT_FAILED");
    }

    await ProjectService.touch(task.projectId.toString());

    return updated;
  }
}
