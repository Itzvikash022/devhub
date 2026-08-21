import { TaskRepository } from "@/repositories/task.repository";
import { CalendarEventRepository } from "@/repositories/calendar-event.repository";
import { ProjectRepository } from "@/repositories/project.repository";
import { ProjectService } from "@/services/project.service";
import { CreateTaskInput, UpdateTaskInput } from "@/schemas/task.schema";
import { ITaskDocument } from "@/models/Task";
import { deleteObject } from "@/lib/r2";

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

    const bugNumber = await ProjectRepository.incrementBugCounter(projectId);
    let closedAt: Date | null = null;
    if (data.status === "done") {
      closedAt = new Date();
    }

    const task = await TaskRepository.create({
      projectId,
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      dueDate: data.dueDate || null,
      type: data.type || "task",
      bugNumber,
      area: data.area || null,
      screenshots: data.screenshots || [],
      assignedTo: data.assignedTo || null,
      createdBy: userId,
      closedAt,
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

  static async listByProjectId(userId: string, projectId: string): Promise<ITaskDocument[]> {
    // Verify project ownership
    const project = await ProjectService.getById(userId, projectId);
    const rawOwnerId = (project.userId as any)?._id || project.userId;
    const ownerId = rawOwnerId.toString();

    const tasks = await TaskRepository.findAllByProjectId(projectId);
    
    // Backfill any tasks missing bugNumber (general itemNumber) or createdBy
    let projectTouched = false;
    for (const task of tasks) {
      const updateData: { bugNumber?: number; createdBy?: string } = {};
      let needsBackfill = false;

      if (task.bugNumber === null || task.bugNumber === undefined) {
        const nextNum = await ProjectRepository.incrementBugCounter(projectId);
        updateData.bugNumber = nextNum;
        needsBackfill = true;
      }
      if (!task.createdBy) {
        updateData.createdBy = ownerId;
        needsBackfill = true;
      }

      if (needsBackfill) {
        await TaskRepository.backfill(task._id.toString(), updateData);
        projectTouched = true;
      }
    }

    if (projectTouched) {
      return TaskRepository.findAllByProjectId(projectId);
    }
    return tasks;
  }

  /**
   * Updates task attributes, checking ownership, and syncing calendar deadlines.
   */
  static async update(userId: string, id: string, data: UpdateTaskInput): Promise<ITaskDocument> {
    const task = await this.verifyTaskOwnership(userId, id);

    let closedAtUpdate = {};
    if (data.status !== undefined) {
      const wasClosed = task.status === "done";
      const isClosed = data.status === "done";
      if (isClosed && !wasClosed) {
        closedAtUpdate = { closedAt: new Date() };
      } else if (!isClosed && wasClosed) {
        closedAtUpdate = { closedAt: null };
      }
    }

    const updated = await TaskRepository.update(id, {
      ...data,
      ...closedAtUpdate,
    });
    
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

    // If it's a bug with screenshots, delete the R2 objects
    if (task.type === "bug" && task.screenshots && task.screenshots.length > 0) {
      for (const url of task.screenshots) {
        try {
          const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";
          const r2Key = publicUrl ? url.replace(`${publicUrl}/`, "") : url;
          await deleteObject(r2Key);
        } catch (err) {
          console.error(`Failed to delete bug screenshot ${url} from R2 during delete:`, err);
        }
      }
    }

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

    const updated = await TaskRepository.addComment(id, text, userId);
    if (!updated) {
      throw new Error("COMMENT_FAILED");
    }

    await ProjectService.touch(task.projectId.toString());

    return updated;
  }
}
