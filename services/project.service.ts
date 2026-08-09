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
import { Task } from "@/models/Task";
import { deleteObject } from "@/lib/r2";
import bcrypt from "bcryptjs";
import { UserRepository } from "@/repositories/user.repository";

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

    const projectOwnerId = project.userId?._id?.toString() || project.userId?.toString();
    const isOwner = projectOwnerId === userId;
    const isShared = (project as any).sharedWith?.some(
      (user: any) => (user?._id?.toString() || user?.toString()) === userId
    );

    if (!isOwner && !isShared) {
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
   * Deletes a project, verifying ownership and password.
   */
  static async delete(userId: string, id: string, password?: string): Promise<void> {
    if (!password) {
      throw new Error("INVALID_PASSWORD");
    }

    // Verify ownership first (must be owner to delete)
    const project = await this.getById(userId, id);
    const projectOwnerId = project.userId?._id?.toString() || project.userId?.toString();
    if (projectOwnerId !== userId) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }

    // Verify password
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error("NOT_FOUND");
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error("INVALID_PASSWORD");
    }

    const deleted = await ProjectRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    // Cascade delete project details
    await ProjectDetailRepository.deleteByProjectId(id);

    // Find all bugs in the project and delete their screenshots from R2
    const projectBugs = await Task.find({ projectId: id, type: "bug" }).exec();
    for (const bug of projectBugs) {
      if (bug.screenshots && bug.screenshots.length > 0) {
        for (const url of bug.screenshots) {
          try {
            const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";
            const r2Key = publicUrl ? url.replace(`${publicUrl}/`, "") : url;
            await deleteObject(r2Key);
          } catch (err) {
            console.error(`Failed to delete bug screenshot ${url} during project deletion:`, err);
          }
        }
      }
    }

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

  /**
   * Touches a project's updatedAt timestamp.
   */
  static async touch(id: string): Promise<void> {
    await ProjectRepository.touch(id);
  }

  /**
   * Adds a shared user to a project (invitation accepted).
   * Verifies the inviter owns the project.
   */
  static async addSharedUser(inviterId: string, projectId: string, userIdToAdd: string): Promise<void> {
    const project = await this.getById(inviterId, projectId);
    const projectOwnerId = project.userId?._id?.toString() || project.userId?.toString();
    
    if (projectOwnerId !== inviterId) {
      throw new Error("ONLY_OWNER_CAN_SHARE");
    }

    const updated = await ProjectRepository.addSharedUser(projectId, userIdToAdd);
    if (!updated) {
      throw new Error("FAILED_TO_ADD_USER");
    }
  }
}
