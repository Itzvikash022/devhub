import { ProjectRepository } from "@/repositories/project.repository";
import { ProjectDetailRepository } from "@/repositories/project-detail.repository";
import { TaskRepository } from "@/repositories/task.repository";
import { CalendarEventRepository } from "@/repositories/calendar-event.repository";
import { PipelineRepository } from "@/repositories/pipeline.repository";
import { ImageAssetRepository } from "@/repositories/image-asset.repository";
import { PasswordRepository } from "@/repositories/password.repository";
import { DocumentRepository } from "@/repositories/document.repository";
import { CreateProjectInput, UpdateProjectInput } from "@/schemas/project.schema";
import { IProjectDocument } from "@/models/Project";
import { deleteObject } from "@/lib/r2";

export class ProjectService {
  /**
   * Creates a new project for a user.
   */
  static async create(userId: string, data: CreateProjectInput): Promise<IProjectDocument> {
    return ProjectRepository.create({
      userId,
      name: data.name,
      description: data.description || "",
      status: data.status || "active",
    });
  }

  /**
   * Retrieves a single project, verifying ownership.
   */
  static async getById(userId: string, id: string): Promise<IProjectDocument> {
    const project = await ProjectRepository.findById(id);

    if (!project) {
      throw new Error("NOT_FOUND");
    }

    if (project.userId.toString() !== userId) {
      throw new Error("FORBIDDEN");
    }

    return project;
  }

  /**
   * Lists all projects for a user, with optional status filters.
   */
  static async list(userId: string, filter?: { status?: string }): Promise<IProjectDocument[]> {
    return ProjectRepository.findAllByUserId(userId, filter);
  }

  /**
   * Updates a project, verifying ownership.
   */
  static async update(
    userId: string,
    id: string,
    data: UpdateProjectInput
  ): Promise<IProjectDocument> {
    // Verify ownership first
    await this.getById(userId, id);

    const updated = await ProjectRepository.update(id, data);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  }

  /**
   * Deletes a project, verifying ownership.
   */
  static async delete(userId: string, id: string): Promise<void> {
    // Verify ownership first
    await this.getById(userId, id);

    const deleted = await ProjectRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    // Cascade delete project details
    await ProjectDetailRepository.deleteByProjectId(id);

    // Cascade delete tasks
    await TaskRepository.deleteByProjectId(id);

    // Cascade delete linked calendar events
    await CalendarEventRepository.deleteByProjectId(id);

    // Cascade delete pipeline items
    await PipelineRepository.deleteByProjectId(id);

    // Cascade delete project images from R2 and MongoDB
    const projectImages = await ImageAssetRepository.findAllByProjectId(id);
    for (const img of projectImages) {
      try {
        await deleteObject(img.r2Key);
      } catch (err) {
        console.error(`Failed to delete project image R2 object ${img.r2Key}:`, err);
      }
    }
    await ImageAssetRepository.deleteByProjectId(id);

    // Cascade unlink project passwords (keep them in global vault)
    await PasswordRepository.unlinkAllByProjectId(id);

    // Cascade unlink project documents (keep them in global vault)
    await DocumentRepository.unlinkAllByProjectId(id);
  }
}
